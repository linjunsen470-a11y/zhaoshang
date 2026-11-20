import Image from 'next/image'
import Link from 'next/link'
import claypotMeal from './claypot-meal.webp'
import diningRoom from './dining-room.webp'
import logo from './jinyi.webp'
import servingCounter from './serving-counter.webp'
import MiniProgramSearch from './MiniProgramSearch'

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

      <main id="main" className="gallery">
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
      </main>

      <footer className="site-footer">
        <p>广州锦奕咨询服务有限公司</p>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">粤ICP备2026186178号</a>
      </footer>
    </>
  )
}
