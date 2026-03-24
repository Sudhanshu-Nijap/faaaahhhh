import React from 'react';
import { Shield, Github, Twitter } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative border-t border-white/5 bg-background-void py-6 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <Shield className="text-eu-accent size-5" />
                    <span className="text-lg font-black font-outfit text-white tracking-tight-mega uppercase">
                        Sentinel<span className="text-eu-accent italic">AI</span>
                    </span>
                </div>
                
                {/* Copyright */}
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">
                    SENTINEL AI © {currentYear} • BUILT FOR AUTOMATED QA & TESTING
                </div>

                {/* Socials */}
                <div className="flex gap-6">
                    <a href="https://github.com/Sudhanshu-Nijap" className="text-slate-500 hover:text-white transition-colors">
                        <Github size={18} />
                    </a>
                    <a href="#" className="text-slate-500 hover:text-white transition-colors">
                        <Twitter size={18} />
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
