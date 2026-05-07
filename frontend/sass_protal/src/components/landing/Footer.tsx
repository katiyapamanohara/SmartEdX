"use client";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-950 pt-20 pb-10 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                  <div className="sm:col-span-2">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">S</div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">SmartEdX</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">Empowering education with intelligence. Join the revolution today.</p>
                      
                      {/* Newsletter */}
                      <form className="max-w-xs">
                          <label className="text-xs font-bold text-gray-900 dark:text-white uppercase mb-2 block">Subscribe to our newsletter</label>
                          <div className="flex gap-2">
                              <input type="email" placeholder="Enter your email" className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg hover:shadow-indigo-600/30">Go</button>
                          </div>
                      </form>
                  </div>
                  {[
                      { title: "Product", links: ["Features", "Pricing", "Security", "Enterprise"] },
                      { title: "Resources", links: ["Documentation", "API Reference", "Blog", "Community"] },
                      { title: "Company", links: ["About", "Careers", "Legal", "Contact"] },
                  ].map((col, i) => (
                      <div key={i}>
                          <h4 className="font-bold text-gray-900 dark:text-white mb-6">{col.title}</h4>
                          <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                              {col.links.map(link => (
                                  <li key={link}><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{link}</a></li>
                              ))}
                          </ul>
                      </div>
                  ))}
              </div>
              <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400 flex flex-col md:flex-row justify-between items-center gap-4">
                  <span>© 2026 SmartEdX Inc. All rights reserved.</span>
                   <div className="flex gap-6">
                       <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</a>
                       <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</a>
                   </div>
              </div>
          </div>
      </footer>
  );
}
