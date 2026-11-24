import Image from 'next/image'
import Link from 'next/link'
import claypotMeal from './claypot-meal.webp'
import diningRoom from './dining-room.webp'
import logo from './jinyi.webp'
import lunchHour from './lunch-hour.webp'
import policeFiling from './police-filing.webp'
import servingCounter from './serving-counter.webp'
import MiniProgramSearch from './MiniProgramSearch'

const footerGroups = [
  { title: '业务服务', links: [['商铺选址', '/services.html#leasing'], ['企业用餐', '/services.html#catering']] },
  { title: '获得帮助', links: [['咨询指南', '/guide.html'], ['联系我们', '/contact.html']] },
  { title: '关于锦奕', links: [['公司介绍', '/about.html'], ['企业信息', '/about.html#company']] },
]

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">跳至主要内容</a>
      <header className="masthead">
        <Link className="wordmark" href="/" prefetch={false} aria-label="锦奕首页">
          <Image src={logo} alt="锦奕" unoptimized />
        </Link>
        <nav aria-label="主导航">
          <a href="/services.html">业务介绍</a>
          <a href="/about.html">关于锦奕</a>
          <a href="/contact.html">联系我们</a>
        </nav>
      </header>

      <main id="main">
        <div className="gallery">
          <section className="opening" aria-labelledby="opening-title">
            <Image className="space-photo" src={diningRoom} alt="木格栅天花下，餐饮档口沿着开阔的用餐区排开" unoptimized loading="eager" fetchPriority="high" />
            <div className="opening-content">
              <h1 id="opening-title">下一间店，<br />开在哪里？</h1>
              <div id="mini-program">
                <MiniProgramSearch />
              </div>
            </div>
          </section>
          <Image className="counter-photo" src={servingCounter} alt="开放式出餐台前，厨师正为顾客备餐" unoptimized loading="eager" />
          <Image className="meal-photo" src={claypotMeal} alt="一份配着米饭、时蔬和汤的砂锅菜" unoptimized loading="eager" />
        </div>

        <section className="field-story" aria-labelledby="field-title">
          <div className="field-photo">
            <Image src={lunchHour} alt="午餐时段，顾客在餐饮档口点餐、落座用餐" unoptimized loading="lazy" />
          </div>
          <div className="field-copy">
            <h2 id="field-title">从午市，看一个铺位。</h2>
            <p>到店里走一圈，看午餐时人从哪里来、在哪个窗口停下。找铺时，也把出餐动线、厨房条件和开放时段一起看清楚。</p>
            <a href="/services.html#leasing">了解商铺选址 <span aria-hidden="true">↗</span></a>
          </div>
        </section>
        <div className="explore">
          <a href="/services.html#catering"><strong>为企业安排用餐</strong><span>驻场食堂与集中配餐 <i aria-hidden="true">↗</i></span></a>
          <a href="/about.html"><strong>认识锦奕</strong><span>商务对接与现场团队 <i aria-hidden="true">↗</i></span></a>
          <a href="/contact.html"><strong>聊聊你的需求</strong><span>看铺、试餐与商务联系 <i aria-hidden="true">↗</i></span></a>
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-groups">
          {footerGroups.map(({ title, links }, index) => {
            const list = (
              <div className="footer-list">
                {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
              </div>
            )
            return (
              <div className="footer-group" key={title}>
                <div className="footer-desktop"><strong>{title}</strong>{list}</div>
                <details open={index === 0}>
                  <summary>{title}</summary>
                  {list}
                </details>
              </div>
            )
          })
        </div>
        <div className="filing-links">
          <span>© 2026 广州锦奕咨询服务有限公司</span>
          <a href="/privacy.html">隐私说明</a>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">粤ICP备2026186178号</a>
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=44011802001719" target="_blank" rel="noopener noreferrer">
            <Image src={policeFiling} alt="" width={19} height={20} unoptimized />
            <span>粤公网安备44011802001719号</span>
          </a>
        </div>
      </footer>
    </>
  )
}
