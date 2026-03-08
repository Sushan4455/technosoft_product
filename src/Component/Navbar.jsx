import React from 'react';
import logoImage from '../assets/Technosoft International-02.jpg';

const Navbar = () => {
  const navLinks = [
    { name: 'Products', href: '#' },
    { name: 'Features', href: '#' },
    { name: 'Pricing', href: '#' },
    { name: 'Resources', href: '#' },
    { name: 'Blogs', href: '#' },
  ];

  return (
    // Changed to flex-col to easily stack the nav and the banner
    <header className="w-full font-sans flex flex-col">
      
      {/* 1. Main Navigation (Now on top) */}
      <nav className="max-w-[1440px] w-full mx-auto px-6 lg:px-12 py-4 flex items-center justify-between bg-white">
        
        {/* LEFT SIDE: Logo, Studio Name & Nav Links */}
        <div className="flex items-center gap-8 lg:gap-12">
          
    {/* Logo & Gradient Text */}
<a href="/" className="flex items-center gap-3 cursor-pointer group">
  <img 
    src={logoImage} /* Use the imported variable here without quotes */
    alt="Logo" 
    className="w-30 h-10 object-contain" 
  />
</a>

          {/* Navigation Links (Aligned to the left) */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-normal text-gray-800 hover:text-[#007dd0] transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Sign In */}
        <div className="flex items-center">
          <a 
            href="/login" 
            className="flex items-center gap-2 text-sm font-normal text-gray-800 hover:text-[#007dd0] transition-colors group"
          >
            Sign in 
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="group-hover:translate-x-1 transition-transform duration-200"
            >
              <path d="m10 17 5-5-5-5"/>
              <path d="M15 12H3"/>
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            </svg>
          </a>
        </div>
      </nav>

      {/* 2. Top Menu Banner (Now at the bottom of the header) */}
      <div className="w-full bg-[#007dd0] py-2 px-4 text-center">
        <h4 className="text-white text-sm md:text-base font-normal">
          Say goodbye to messy spreadsheets. Manage your accounting, inventory, and sales in one unified platform.{" "}
          <a href="#" className="underline hover:text-gray-200 transition-colors">
            Learn more
          </a>
        </h4>
      </div>

    </header>
  );
};

export default Navbar;