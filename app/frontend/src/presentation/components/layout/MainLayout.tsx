import React from 'react';
import { Outlet } from 'react-router-dom';
import { MainNavbar } from './MainNavbar';
import { MainFooter } from './MainFooter';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-brand-dark font-sans selection:bg-secondary selection:text-bg-main">
      <MainNavbar />
      <main className="grow">
        <Outlet />
      </main>
      <MainFooter />
    </div>
  );
};
