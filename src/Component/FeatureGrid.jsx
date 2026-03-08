import React from 'react';
// Note: If your first image is a local file, remember to import it!
// import analyticsImage from '../assets/image-removebg-preview (1).png';

const FeaturesGrid = () => {
  const features = [
    {
      id: 1,
      title: 'Real-Time Analytics',
      description: <>Get instant insights into your business performance with our <br className="hidden md:block" /> real-time analytics dashboard.</>,
      image: 'https://i.pinimg.com/1200x/5a/53/5a/5a535a7fec0eabad96156feb9d3f260c.jpg', // Replace with {analyticsImage} if imported
    },
    {
      id: 2,
      title: 'Inventory Management',
      description: <>Effortlessly track and manage your inventory levels, ensuring <br className="hidden md:block" /> you never run out of stock.</>,
      image: 'https://i.pinimg.com/1200x/9f/b8/8c/9fb88cb512db080d5766e0f5e1f9ef23.jpg',
    },
    {
      id: 3,
      title: 'Sales Tracking',
      description: <>Monitor your sales performance and identify trends to <br className="hidden md:block" /> optimize your sales strategy.</>,
      image: 'https://i.pinimg.com/736x/04/17/80/04178000170bf1ca61bc8864ea763d16.jpg',
    }
  ];

  return (
    // Replaced standard display: flex with flex-col for mobile and md:flex-row for desktop
    <div className="flex flex-col md:flex-row gap-5 p-5 items-center justify-center w-full max-w-[1440px] mx-auto mt-8">
      
      {features.map((feature) => (
        <div 
          key={feature.id}
          // Translated all your custom transitions, hover effects, and shadows into Tailwind
          className="w-full md:w-[32%] h-[500px] flex flex-col border border-[#007dd0] rounded-[10px] bg-white transition-all duration-[400ms] ease-[cubic-bezier(0.165,0.84,0.44,1)] will-change-transform shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.01)] hover:-translate-y-[10px] hover:border-[#1774b5] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.08)] relative overflow-hidden"
        >
          {/* Text Container */}
          <div className="relative z-10">
            <h1 className="text-black text-[25px] font-normal mt-5 p-2.5 ml-5">
              {feature.title}
            </h1>
            <p className="text-black text-[16px] font-normal p-2.5 ml-5">
              {feature.description}
            </p>
          </div>
          
          {/* Image */}
          <img 
            src={feature.image} 
            alt={feature.title} 
            className="w-[80%] my-5 mx-auto block relative z-10 object-contain"
          />
        </div>
      ))}
      
    </div>
  );
};

export default FeaturesGrid;