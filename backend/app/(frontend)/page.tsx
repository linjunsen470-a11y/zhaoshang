import Image from 'next/image'
import Link from 'next/link'
import diningRoom from './dining-room.webp'
import logo from './jinyi.webp'
import MiniProgramSearch from './MiniProgramSearch'

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">跳至主要内容</a>
      <header className="masthead">
        <div className="wrap masthead-inner">
          <Link className="wordmark" href="/" prefetch={false} aria-label="锦奕首页">
            <Image src={logo} alt="锦奕" unoptimized />
          </Link>
          <nav aria-label="主导航">
            <a href="#services">业务范围</a>
            <a href="/about.html">企业信息</a>
            <a href="/contact.html">联系锦奕</a>
          </nav>
        </div>
      </header>

      <main id="main" className="wrap">
        <section className="opening" aria-labelledby="opening-title">
          <div className="introduction">
            <p className="byline">广州锦奕咨询服务有限公司</p>
            <h1 id="opening-title">商铺选址<span>与餐饮对接</span></h1>
            <p className="summary">为经营者寻找校园、园区与写字楼的铺位，<br className="wide-break" />为企业对接日常用餐服务。</p>
            <div id="mini-program" className="mini-program">
              <p>在微信搜索<strong>「岭南旺铺」</strong>，了解铺位详情。</p>
              <MiniProgramSearch />
            </div>
          </div>
          <figure>
            <Image className="cover" src={diningRoom} alt="木色天花板下，餐桌沿着明亮的食堂大厅依次排开" unoptimized loading="eager" fetchPriority="high" />
            <figcaption><span>食堂用餐空间</span><span>选自《锦奕商务画册》</span></figcaption>
          </figure>
        </section>

        <section id="services" className="services" aria-labelledby="services-title">
          <h2 id="services-title">业务范围</h2>
          <div className="service">
            <h3>商铺与档口</h3>
            <p>按经营品类、区域与预算，协助了解铺位条件，沟通看铺安排。</p>
          </div>
          <div className="service">
            <h3>企业用餐</h3>
            <p>围绕工厂与园区的用餐需求，对接驻场食堂或集中配餐，协助现场踏勘与试餐。</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <p>广州锦奕咨询服务有限公司</p>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">粤ICP备2026186178号</a>
          <a className="footer-contact" href="/contact.html">联系方式 <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </>
  )
}
