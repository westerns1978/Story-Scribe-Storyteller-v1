
import React, { useState, useEffect } from 'react';
import { healthCheck } from '../services/api';
import WifiIcon from './icons/WifiIcon';
import SparklesIcon from './icons/SparklesIcon';
import BoltIcon from './icons/BoltIcon';

type NodeStatus = 'active' | 'waiting' | 'error';

interface NodeProps {
    label: string;
    status: NodeStatus;
    icon: React.ReactNode;
}

const Node: React.FC<NodeProps> = ({ label, status, icon }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-full border border-white/5">
        <div className={status === 'active' ? 'text-amber-500' : 'text-slate-500'}>
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter leading-none">{label}</span>
            <span className={`text-[9px] font-mono font-bold uppercase ${status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                {status === 'active' ? 'Online' : 'Offline'}
            </span>
        </div>
    </div>
);

const ConnectivityIndicator: React.FC = () => {
    const [stats, setStats] = useState({ gemini: 'waiting', supabase: 'waiting', xai: 'active' });

    const check = async () => {
        try {
            const h = await healthCheck();
            setStats({
                gemini: h.gemini === 'active' ? 'active' : 'error',
                supabase: h.supabase === 'connected' ? 'active' : 'error',
                xai: 'active' // Always active for this demo/context
            });
        } catch (e) {
            setStats({ gemini: 'error', supabase: 'error', xai: 'active' });
        }
    };

    useEffect(() => {
        check();
        const t = setInterval(check, 30000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="flex flex-col gap-2 w-full p-2">
            <Node label="Gemini Node" status={stats.gemini as NodeStatus} icon={<SparklesIcon className="w-3 h-3"/>} />
            <Node label="Vault Node" status={stats.supabase as NodeStatus} icon={<BoltIcon className="w-3 h-3"/>} />
            <Node label="Logic Node" status={stats.xai as NodeStatus} icon={<WifiIcon className="w-3 h-3"/>} />
        </div>
    );
};

export default ConnectivityIndicator;
