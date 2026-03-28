import React from 'react';
import { Leaf, UtensilsCrossed, Sparkles } from 'lucide-react';

export default function BrandIcon({ size = 36 }) {
  const iconSize = Math.round(size * 0.5);
  const leafSize = Math.round(size * 0.5);
  const sparkleSize = Math.round(size * 0.25);
  const radius = size <= 36 ? 10 : 14;

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
      borderRadius: `${radius}px`,
      boxShadow: '0 2px 8px rgba(122, 94, 211, 0.35)',
      flexShrink: 0,
    }}>
      <Leaf size={leafSize} color="white" strokeWidth={2.5} style={{ position: 'absolute', top: '3px', left: '3px', opacity: 0.35 }} />
      <UtensilsCrossed size={iconSize} color="white" strokeWidth={2.5} style={{ position: 'relative', zIndex: 1 }} />
      <Sparkles size={sparkleSize} color="#fbbf24" strokeWidth={3} style={{ position: 'absolute', top: '-2px', right: '-2px', zIndex: 2 }} />
    </div>
  );
}
