import React, { useMemo, useState } from 'react';
import { StoryArchiveItem } from '../types';
import GalaxyIcon from './icons/GalaxyIcon';
import XMarkIcon from './icons/XMarkIcon';
import UsersIcon from './icons/UsersIcon';
import BoltIcon from './icons/BoltIcon';

interface LegacyGraphProps {
  stories: StoryArchiveItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectStory: (story: StoryArchiveItem) => void;
}

interface Node {
    id: string;
    label: string;
    type: 'story' | 'person';
    x: number;
    y: number;
    storyRef?: StoryArchiveItem;
}

interface Link {
    source: string;
    target: string;
}

export const LegacyGraph: React.FC<LegacyGraphProps> = ({ stories, isOpen, onClose, onSelectStory }) => {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const { nodes, links } = useMemo(() => {
        if (!stories.length) return { nodes: [], links: [] };

        const tempNodes: Node[] = [];
        const tempLinks: Link[] = [];
        const personMap = new Map<string, string[]>(); // Name -> StoryIDs

        // 1. Create Story Nodes and Map People
        stories.forEach((story, idx) => {
            const storyId = `story-${story.id}`;
            const angle = (idx / stories.length) * 2 * Math.PI;
            const radius = 300;
            
            tempNodes.push({
                id: storyId,
                label: story.storytellerName,
                type: 'story',
                x: 500 + radius * Math.cos(angle),
                y: 400 + radius * Math.sin(angle),
                storyRef: story
            });

            const family = story.extraction?.family || [];
            family.forEach(person => {
                const name = person.name.trim();
                if (!name) return;
                const existing = personMap.get(name) || [];
                personMap.set(name, [...existing, storyId]);
            });
        });

        // 2. Create Person Nodes and Links for Shared Connections
        let personIdx = 0;
        personMap.forEach((storyIds, name) => {
            if (storyIds.length > 1) { // Only show people connected to multiple stories
                const personId = `person-${personIdx++}`;
                // Random position in central area
                const x = 400 + Math.random() * 200;
                const y = 300 + Math.random() * 200;

                tempNodes.push({ id: personId, label: name, type: 'person', x, y });
                
                storyIds.forEach(sId => {
                    tempLinks.push({ source: sId, target: personId });
                });
            }
        });

        return { nodes: tempNodes, links: tempLinks };
    }, [stories]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#050404] z-[500] flex flex-col animate-fade-in overflow-hidden">
            <style>{`
                @keyframes glow-pulse {
                    0%, 100% { filter: drop-shadow(0 0 5px rgba(212,175,55,0.4)); }
                    50% { filter: drop-shadow(0 0 15px rgba(212,175,55,0.8)); }
                }
                .node-glow { animation: glow-pulse 3s infinite ease-in-out; }
                .link-surge { stroke-dasharray: 5; animation: dash 20s linear infinite; }
                @keyframes dash { to { stroke-dashoffset: -100; } }
            `}</style>

            <header className="p-8 lg:p-12 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 relative z-10">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-gemynd-oxblood/20 rounded-2xl border border-gemynd-oxblood/30">
                        <GalaxyIcon className="w-8 h-8 text-gemynd-agedGold" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-display font-black text-white tracking-tighter">The Story Constellation</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-1">Family Memory Connections</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-4 hover:bg-white/10 rounded-full text-white/40"><XMarkIcon className="w-8 h-8"/></button>
            </header>

            <main className="flex-1 relative cursor-grab active:cursor-grabbing">
                <svg viewBox="0 0 1000 800" className="w-full h-full">
                    {/* Background Gradients */}
                    <radialGradient id="graphGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(150,45,45,0.05)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                    <rect width="100%" height="100%" fill="url(#graphGradient)" />

                    {/* Links */}
                    {links.map((link, i) => {
                        const source = nodes.find(n => n.id === link.source);
                        const target = nodes.find(n => n.id === link.target);
                        if (!source || !target) return null;
                        return (
                            <line 
                                key={i}
                                x1={source.x} y1={source.y}
                                x2={target.x} y2={target.y}
                                stroke="rgba(212,175,55,0.15)"
                                strokeWidth="1"
                                className="link-surge"
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            onClick={() => setSelectedNode(node)}
                            className="cursor-pointer group"
                        >
                            <circle 
                                r={node.type === 'story' ? 24 : 12} 
                                className={`transition-all duration-500 ${node.type === 'story' ? 'fill-gemynd-oxblood node-glow' : 'fill-gemynd-agedGold/40'} group-hover:scale-125`}
                            />
                            {node.type === 'story' && (
                                <text 
                                    y="45" 
                                    textAnchor="middle" 
                                    className="fill-white/60 text-[10px] font-black uppercase tracking-widest pointer-events-none"
                                >
                                    {node.label}
                                </text>
                            )}
                            {node.type === 'person' && (
                                <text 
                                    y="30" 
                                    textAnchor="middle" 
                                    className="fill-gemynd-agedGold text-[8px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {node.label}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>

                {/* Node Detail HUD */}
                {selectedNode && (
                    <div className="absolute bottom-12 left-12 right-12 lg:left-auto lg:right-12 lg:w-96 glass-tier-1 p-8 rounded-[3rem] border border-white/10 animate-slide-up">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-2xl ${selectedNode.type === 'story' ? 'bg-gemynd-oxblood' : 'bg-gemynd-agedGold text-black'}`}>
                                {selectedNode.type === 'story' ? <BoltIcon className="w-5 h-5"/> : <UsersIcon className="w-5 h-5"/>}
                            </div>
                            <button onClick={() => setSelectedNode(null)} className="p-2 text-white/20"><XMarkIcon className="w-5 h-5"/></button>
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-2">{selectedNode.label}</h3>
                        <p className="text-slate-400 text-sm font-serif italic mb-6">
                            {selectedNode.type === 'story' ? 'Primary story record in the family constellation.' : 'Shared ancestral connection linking multiple archives.'}
                        </p>
                        
                        {selectedNode.storyRef && (
                            <button 
                                onClick={() => onSelectStory(selectedNode.storyRef!)}
                                className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
                            >
                                Re-Open Archive
                            </button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};