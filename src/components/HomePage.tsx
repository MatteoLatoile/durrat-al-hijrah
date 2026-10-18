'use client';

import {useEffect, useMemo, useState} from 'react';
import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {ArrowDown, ArrowRight, ArrowUpLeft, Check, Compass, Gem, HeartHandshake, Home, MapPin, MoveUpRight, Search, ShieldCheck, X} from 'lucide-react';
import {Header} from './Header';
import {HomeFeaturedLive} from './HomeFeaturedLive';
import {BuildingScene} from './BuildingScene';
import {SearchPanel, type Filters} from './SearchPanel';
import {PropertyCard} from './PropertyCard';
import {sampleProperties, type Property} from '@/lib/properties';

export function HomePage() {
  const t = useTranslations('Hero');
  const f = useTranslations('Featured');
  const s = useTranslations('Search');
  const p = useTranslations('Property');
  const v = useTranslations('Value');
  const foot = useTranslations('Footer');
  const nav = useTranslations('Nav');
  const locale = useLocale();
  const [applied, setApplied] = useState<Filters>({transaction: 'all', type: 'all', district: 'all', minPrice: '', maxPrice: '', bedrooms: '', minArea: ''});
  const [selected, setSelected] = useState<Property | null>(null);

  const properties = useMemo(() => sampleProperties.filter((item) => {
    if (applied.transaction !== 'all' && item.transaction !== applied.transaction) return false;
    if (applied.type !== 'all' && item.type !== applied.type) return false;
    if (applied.district !== 'all' && item.district !== applied.district) return false;
    if (applied.minPrice && item.price < Number(applied.minPrice)) return false;
    if (applied.maxPrice && item.price > Number(applied.maxPrice)) return false;
    if (applied.bedrooms && item.beds < Number(applied.bedrooms)) return false;
    if (applied.minArea && item.area < Number(applied.minArea)) return false;
    return true;
  }), [applied]);

  useEffect(() => {
    if (!selected) return;
    const escape = (e: KeyboardEvent) => {if (e.key === 'Escape') setSelected(null);};
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', escape);
    return () => {document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', escape);};
  }, [selected]);

  return <>
    <div className="site-shell">
      <section className="hero" id="home">
        <div className="hero-noise" aria-hidden="true" />
        <Header />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-brand-reveal" aria-hidden="true">
              <span className="hero-brand-ring"/><Image src="/brand-gold.png" width={81} height={81} alt="" priority />
            </div>
            <div className="hero-eyebrow"><span className="eyebrow-rule"/>{t('eyebrow')}</div>
            <h1><span className="hero-line-one">{t('headlineOne')}</span><span className="hero-line-two">{t('headlineTwo')}</span></h1>
            <p className="hero-description">{t('description')}</p>
            <div className="hero-buttons">
              <a className="button button-primary" href="#search"><span>{t('explore')}</span><ArrowUpLeft size={18}/></a>
              <a className="button button-ghost" href="#why-us"><span>{t('learn')}</span><ArrowRight size={17}/></a>
            </div>
            <div className="hero-scroll"><span className="scroll-icon"><ArrowDown size={17}/></span>{t('scroll')}</div>
          </div>
          <div className="hero-visual" aria-label={t('sceneFoot')} role="img">
            <div className="scene-halo" aria-hidden="true" />
            <div className="scene-orbit orbit-one" aria-hidden="true"/>
            <div className="scene-orbit orbit-two" aria-hidden="true"/>
            <BuildingScene />
            <div className="scene-vertical-label" aria-hidden="true">ARCHITECTURE / MADINAH</div>
            <div className="scene-counter" aria-hidden="true">01 <span>—</span> 03</div>
            <div className="scene-caption"><span className="caption-line"/>
              <span>{t('sceneLabel')}<small>{t('sceneFoot')}</small></span>
            </div>
          </div>
        </div>
        <div className="hero-bottom-rule"/>
      </section>

      <SearchPanel onSearch={setApplied}/>

      <HomeFeaturedLive applied={applied}/>

      <section className="why-section section-pad" id="why-us">
        <div className="container why-layout">
          <div className="why-intro"><span className="section-eyebrow"><span/> {v('eyebrow')}</span><h2 className="section-title">{v('title')}</h2><span className="why-mark" aria-hidden="true"><Image src="/brand-dark.png" alt="" width={155} height={155}/></span></div>
          <div className="value-list">
            <div className="value-row"><span className="value-index">01</span><span className="value-icon"><Compass size={26} strokeWidth={1.5}/></span><div><h3>{v('oneTitle')}</h3><p>{v('oneText')}</p></div><MoveUpRight size={17} className="value-arrow"/></div>
            <div className="value-row"><span className="value-index">02</span><span className="value-icon"><Gem size={26} strokeWidth={1.5}/></span><div><h3>{v('twoTitle')}</h3><p>{v('twoText')}</p></div><MoveUpRight size={17} className="value-arrow"/></div>
            <div className="value-row"><span className="value-index">03</span><span className="value-icon"><HeartHandshake size={26} strokeWidth={1.5}/></span><div><h3>{v('threeTitle')}</h3><p>{v('threeText')}</p></div><MoveUpRight size={17} className="value-arrow"/></div>
          </div>
        </div>
      </section>

      <section className="about-strip" id="about">
        <div className="container about-inner"><div className="about-wordmark" dir="rtl">درة الهجرة <span>للعقارات</span></div><div className="about-rule"/><p>{foot('tagline')}</p><div className="about-seal"><Home size={19} strokeWidth={1.3}/><span>MADINAH · SAUDI ARABIA</span></div></div>
      </section>

      <section className="closing-cta" id="contact">
        <div className="closing-ornament" aria-hidden="true"><Image src="/brand-gold.png" width={390} height={390} alt="" /></div>
        <div className="container closing-inner"><span className="section-eyebrow light"><span/> DURRAT AL HIJRAH</span><h2>{foot('ctaTitle')}</h2><p>{foot('ctaText')}</p><a className="button button-primary" href="#search"><span>{foot('ctaButton')}</span><ArrowUpLeft size={18}/></a></div>
      </section>

      <footer className="site-footer"><div className="container footer-top"><div className="footer-brand"><Image src="/brand-gold.png" width={45} height={45} alt=""/><span dir="rtl">درة الهجرة للعقارات</span></div><nav aria-label={foot('links')}><a href="#properties">{nav('properties')}</a><a href="#why-us">{nav('services')}</a><a href="#about">{nav('about')}</a></nav></div><div className="container footer-bottom"><a className="adm-footer-link" href={`/${locale}/admin/login`}>Admin</a><span>© 2026 DURRAT AL HIJRAH · {foot('copyright')}</span></div></footer>
    </div>

      </>;
}
