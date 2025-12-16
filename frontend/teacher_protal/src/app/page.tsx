import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Navigation */}
            <nav className="flex justify-between items-center px-8 py-6 bg-white shadow-sm">
                <h1 className="text-2xl font-bold text-indigo-600">SmartEdX</h1>
                <div className="space-x-4">
                    <Link href="#features" className="text-gray-600 hover:text-indigo-600">Features</Link>
                    <Link href="#about" className="text-gray-600 hover:text-indigo-600">About</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="flex flex-col justify-center items-center text-center py-24 px-4">
                <h2 className="text-5xl font-bold text-gray-900 mb-4">
                    Smart Learning, Better Results
                </h2>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                    Revolutionize your education with AI-powered personalized learning paths.
                </p>
             
            </section>

            {/* Features Section */}
            <section id="features" className="bg-white py-20 px-8">
                <h3 className="text-3xl font-bold text-center mb-12">Features</h3>
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="p-6 border border-gray-200 rounded-lg">
                        <h4 className="font-bold text-lg mb-2">AI Powered</h4>
                        <p className="text-gray-600">Intelligent algorithms adapt to your learning style.</p>
                    </div>
                    <div className="p-6 border border-gray-200 rounded-lg">
                        <h4 className="font-bold text-lg mb-2">Track Progress</h4>
                        <p className="text-gray-600">Monitor your improvement with detailed analytics.</p>
                    </div>
                    <div className="p-6 border border-gray-200 rounded-lg">
                        <h4 className="font-bold text-lg mb-2">Personalized</h4>
                        <p className="text-gray-600">Custom learning paths tailored to your goals.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white text-center py-8">
                <p>&copy; 2024 SmartEdX. All rights reserved.</p>
            </footer>
        </div>
    );
}