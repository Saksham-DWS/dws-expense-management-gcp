import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-72 px-4 py-6 sm:px-8 lg:px-12 pt-28 lg:pt-28 min-h-screen overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 pb-16">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
