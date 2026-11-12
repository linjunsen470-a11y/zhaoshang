import sharp from 'sharp'
import { getPayloadInstance } from '../_shared/payloadApi'
import { verifyAuthToken } from '../_shared/tokens'
import { takeRateLimit } from '../_shared/rateLimit'
import { readJsonObject, RequestInputError } from '../_shared/requestInput'
import { getWechatPhone, WechatPhoneError } from '../../../lib/wechatPhone'

export const runtime = 'nodejs'
const empty = { nickname: '', phone: '', phoneVerified: false, avatar: '' }
const columns = 'nickname, phone, phone_verified AS "phoneVerified", avatar'
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function GET(request: Request) {
  const user = verifyAuthToken(request.headers.get('authorization'))
  if (!user) return reply({ error: '请先登录微信' }, 401)
  const { db } = await getPayloadInstance()
  const result = await db.pool.query(`SELECT ${columns} FROM wechat_profiles WHERE owner_open_id = $1`, [user.openid])
  return reply(result.rows[0] || empty)
}

async function avatarValue(value: unknown) {
  if (value === undefined || value === '') return value
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(value)) throw new RequestInputError('头像格式无效')
  try {
    const image = sharp(Buffer.from(value, 'base64'), { limitInputPixels: 16000000 })
    if (!['jpeg', 'png', 'webp'].includes((await image.metadata()).format || '')) throw new Error()
    const photo = await image.rotate().resize(192, 192, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
    return 'data:image/jpeg;base64,' + photo.toString('base64')
  } catch { throw new RequestInputError('请选择有效的头像图片') }
}

export async function PUT(request: Request) {
  const user = verifyAuthToken(request.headers.get('authorization'))
  if (!user) return reply({ error: '请先登录微信' }, 401)
  if (!takeRateLimit('profile:' + user.openid, 20, 600000).allowed) return reply({ error: '操作频繁，请稍后重试' }, 429)
  try {
    const input = await readJsonObject(request, 800 * 1024)
    if (!Object.keys(input).length || Object.keys(input).some(key => !['nickname', 'avatar', 'phone', 'phoneCode'].includes(key))) {
      throw new RequestInputError('资料字段无效')
    }
    const { nickname, phoneCode } = input
    let phone = input.phone
    if (nickname !== undefined && (typeof nickname !== 'string' || nickname.length > 20)) throw new RequestInputError('称呼过长或格式不正确')
    if (phone !== undefined && (typeof phone !== 'string' || (phone !== '' && !/^1[3-9]\d{9}$/.test(phone)))) throw new RequestInputError('请输入有效手机号')
    const avatar = await avatarValue(input.avatar)
    if (phoneCode !== undefined) {
      if (phone !== undefined || typeof phoneCode !== 'string' || !/^\S{1,512}$/.test(phoneCode)) throw new RequestInputError('请重新授权手机号')
      phone = (await getWechatPhone(phoneCode)).phone
    }
    const { db } = await getPayloadInstance()
    // Apply only edited fields, including concurrent first saves from two devices.
    const result = await db.pool.query(`INSERT INTO wechat_profiles (owner_open_id, nickname, phone, phone_verified, avatar)
      VALUES ($1, COALESCE($2::text, ''), COALESCE($3::text, ''), COALESCE($4::boolean, false), COALESCE($5::text, ''))
      ON CONFLICT (owner_open_id) DO UPDATE SET nickname = COALESCE($2, wechat_profiles.nickname),
        phone = COALESCE($3, wechat_profiles.phone), phone_verified = COALESCE($4, wechat_profiles.phone_verified),
        avatar = COALESCE($5, wechat_profiles.avatar), updated_at = now()
      RETURNING ${columns}`, [user.openid, nickname, phone, phone === undefined ? null : phoneCode !== undefined, avatar])
    return reply(result.rows[0])
  } catch (error) {
    if (error instanceof RequestInputError || error instanceof WechatPhoneError) return reply({ error: error.message }, error.status)
    return reply({ error: '资料保存失败，请稍后重试' }, 500)
  }
}
