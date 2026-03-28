import NavBar from './components/NavBar'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Stats from './components/Stats'
import Tokenomics from './components/Tokenomics'
import Roadmap from './components/Roadmap'
import Security from './components/Security'
import Presale from './components/Presale'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-[#07070E] text-[#F0F2F5]">
      <NavBar />
      <Hero />
      <HowItWorks />
      <Stats />
      <Tokenomics />
      <Roadmap />
      <Security />
      <Presale />
      <Footer />
    </div>
  )
}
