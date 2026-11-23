import Link from 'next/link';

export default function PublicNav({ info }) {
  return (
    <header className="pub-nav">
      <div className="wrap">
        <Link href="/" className="logo">
          <img src={info?.logo_url || '/logo.png'} alt="" />
          {info?.name || 'Atha Inn'}
        </Link>
        <nav>
          <Link href="/#rooms">Rooms</Link>
          <Link href="/#discover">Explore Kanditheemu</Link>
          <Link href="/#about">About</Link>
          <Link href="/#gallery">Gallery</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
        <Link href="/book" className="btn coral">Book now</Link>
      </div>
    </header>
  );
}
