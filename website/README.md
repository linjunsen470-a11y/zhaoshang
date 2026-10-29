# 广州锦奕咨询服务有限公司 - 官方极简备案网站

本目录 `website/` 是为**广州锦奕咨询服务有限公司**量身定制的纯静态 HTML/CSS/JS 极简官网，专用于**中国大陆工信部 ICP 网站备案**（广东省通信管理局），同时可作为公司对外官方展示门面。

---

## 一、 文件结构说明

```
website/
├── index.html       # 官网首页（公司形象、三大核心业务概览、微信小程序生态直达、合规页脚）
├── services.html    # 主营业务（商业空间招商咨询、商户选址对接、闲置设备流转、数字化矩阵）
├── about.html       # 关于我们（企业法定登记信息、成立初心、商业定位、合规资质卡片）
├── contact.html     # 联系我们（公司注册/办公地址、接待时间、业务对接指引、FAQ）
├── css/
│   └── style.css    # 纯原生现代高质感企业商务 CSS（无任何 npm/Node 依赖，零外部字体加载，秒开）
├── js/
│   └── main.js      # 原生轻量交互（移动端菜单折叠、年份自动同步）
└── README.md        # 本说明文档
```

---

## 二、 本地预览方式

**无需任何 Node.js、npm 或构建工具！**
直接在资源管理器中双击打开 `website/index.html` 即可在任意浏览器（Edge、Chrome、Safari）中以完美效果浏览。

---

## 三、 备案合规要点（专为广东省通信管理局审核优化）

1. **主体名称完全对齐**：页面各处均明确标注企业主体全称 **广州锦奕咨询服务有限公司**。
2. **地址与执照一致**：联系方式与关于我们页面严格对齐工商地址：**广州市增城区宁西街香山大道55号之二506单元(自编A栋506-2单元)**。
3. **内容严格合规**：
   * 紧扣营业执照经营范围（商业咨询、空间招商、设备流转咨询）。
   * **绝无** 用户注册/登录入口（避免被管局判定为具有交互式用户系统的平台，免除复杂的安全评估）。
   * **绝无** 在线支付/购物车（规避增值电信业务 EDI 许可证前置审批要求）。
   * **绝无** 论坛、留言板或动态评论功能。
4. **工信部链接规范**：所有页面底部均预留了 `粤ICP备XXXXXXXX号-1`，且已正确设置跳转链接到工信部官方系统 `https://beian.miit.gov.cn/`。**备案号通过审核后，只需全局将 `粤ICP备XXXXXXXX号-1` 替换为管局核发的真实备案号即可**。

---

## 四、 线上部署配置参考（Nginx 架构）

建议在云服务器（如腾讯云或阿里云 Linux 主机）上通过 Nginx 分配域名解析：

```nginx
# 1. 公司主网站（用于 ICP 备案，直接托管本 website 目录）
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 强制跳转 HTTPS（申请 SSL 证书后开启）
    # return 301 https://$host$request_uri;

    root /var/www/website;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 2. 小程序 API 接口反代（指向 Next.js / Payload 后端）
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. Payload CMS 运营管理后台（指向 Next.js /admin）
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
