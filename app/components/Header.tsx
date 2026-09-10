import { Link } from 'react-router';
import { Logo } from '~/components/Logo';

export function Header() {
	return (
    <header className="border-b border-neutral-800 bg-neutral-950 px-6 py-3 flex items-center justify-between text-white">
      <Link to="/" className="flex items-center group">
        <Logo className="h-7 sm:h-8" variant="light" />
      </Link>

      <nav className="flex gap-6 items-center text-sm font-medium">
        <Link
          to="/"
          className="text-neutral-400 hover:text-white transition-colors"
        >
          Home
        </Link>
        <Link
          to="/products"
          className="text-neutral-400 hover:text-white transition-colors"
        >
          Cases
        </Link>
        <Link
          to="/cart"
          className="text-neutral-400 hover:text-white transition-colors"
        >
          Cart
        </Link>
      </nav>
    </header>
  );
}
