import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package2, Truck, MapPin, Brain,
  Shield, DollarSign, ShoppingCart, Bell, Plug, BarChart3,
  Settings, LogOut, Activity
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard',     color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)'   },
  { icon: Package2,         label: 'Core ERP',      path: '/erp',           color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  { icon: Truck,            label: 'Transport',     path: '/transport',     color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  { icon: MapPin,           label: 'GPS Tracking',  path: '/tracking',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { icon: Brain,            label: 'AI Engine',     path: '/ai',            color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  { icon: Shield,           label: 'Identity',      path: '/identity',      color: '#f43f5e', bg: 'rgba(244,63,94,0.12)'   },
  { icon: DollarSign,       label: 'Finance',       path: '/finance',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { icon: ShoppingCart,     label: 'Orders',        path: '/orders',        color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)'  },
  { icon: Bell,             label: 'Notifications', path: '/notifications', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  { icon: Plug,             label: 'Integrations',  path: '/integrations',  color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { icon: BarChart3,        label: 'Analytics',     path: '/analytics',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
];

export default function Sidebar() {
  const loc = useLocation();
  const { logout, user } = useAuthStore();
  const { unreadCount }  = useNotificationStore();

  return (
    <aside style={{
      width: 232,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0e1a2e 0%, #0b1422 100%)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      position: 'relative',
      zIndex: 20,
    }}>
      {/* Subtle top glow */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:180,
        background:'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(79,142,247,0.08) 0%, transparent 70%)',
        pointerEvents:'none',
      }}/>

      {/* ── Logo ─────────────────────────────────────────── */}
      <div style={{
        padding:'18px 16px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{
            width:38, height:38,
            background:'linear-gradient(135deg, #4f8ef7 0%, #3d6fd8 100%)',
            borderRadius:11,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(79,142,247,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            flexShrink:0,
          }}>
            <Truck size={18} color="#fff" strokeWidth={2.5}/>
          </div>
          <div>
            <div style={{
              fontFamily:'var(--font)',
              fontWeight:800,
              fontSize:15,
              letterSpacing:'-0.03em',
              color:'#e8edf8',
              lineHeight:1.1,
            }}>
              Transport<span style={{
                background:'linear-gradient(135deg,#4f8ef7,#8b5cf6)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
              }}>OS</span>
            </div>
            <div style={{
              fontFamily:'var(--font-mono)',
              fontSize:9,
              color:'rgba(255,255,255,0.25)',
              letterSpacing:'0.12em',
              textTransform:'uppercase',
              marginTop:2,
            }}>Enterprise · v1.0</div>
          </div>
        </div>
      </div>

      {/* ── Nav label ────────────────────────────────────── */}
      <div style={{ padding:'14px 16px 6px', flexShrink:0 }}>
        <div style={{
          fontFamily:'var(--font-mono)',
          fontSize:9, fontWeight:700,
          letterSpacing:'0.14em',
          color:'rgba(255,255,255,0.2)',
          textTransform:'uppercase',
        }}>Navigation</div>
      </div>

      {/* ── Nav items ─────────────────────────────────────── */}
      <nav style={{ flex:1, padding:'0 8px', overflowY:'auto', overflowX:'hidden' }}>
        {NAV.map(({ icon:Icon, label, path, color, bg }) => {
          const active = loc.pathname === path || loc.pathname.startsWith(path + '/');
          const isNotify = path === '/notifications';
          return (
            <NavLink key={path} to={path} style={{ textDecoration:'none' }}>
              <div style={{
                display:'flex',
                alignItems:'center',
                gap:10,
                padding:'8px 10px',
                borderRadius:10,
                margin:'1.5px 0',
                cursor:'pointer',
                transition:'all 0.16s ease',
                position:'relative',
                background: active ? bg : 'transparent',
                border:`1px solid ${active ? `${color}28` : 'transparent'}`,
              }}>
                {/* Active indicator bar */}
                {active && (
                  <div style={{
                    position:'absolute',
                    left:0, top:'18%', bottom:'18%',
                    width:3,
                    background:`linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
                    borderRadius:'0 3px 3px 0',
                    boxShadow:`0 0 10px ${color}`,
                  }}/>
                )}

                {/* Icon box */}
                <div style={{
                  width:30, height:30,
                  borderRadius:8,
                  background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                  transition:'all 0.16s ease',
                  border: active ? `1px solid ${color}30` : '1px solid transparent',
                }}>
                  <Icon
                    size={14}
                    color={active ? color : 'rgba(255,255,255,0.3)'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>

                {/* Label */}
                <span style={{
                  fontSize:13,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#e8edf8' : 'rgba(255,255,255,0.38)',
                  flex:1,
                  transition:'color 0.16s ease',
                }}>
                  {label}
                </span>

                {/* Notification badge */}
                {isNotify && unreadCount > 0 && (
                  <span style={{
                    width:18, height:18,
                    background:'linear-gradient(135deg,#f43f5e,#e11d48)',
                    borderRadius:'50%',
                    fontSize:9, fontWeight:700,
                    color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 2px 8px rgba(244,63,94,0.5)',
                    flexShrink:0,
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Status card ────────────────────────────────────── */}
      <div style={{ padding:'8px 10px', flexShrink:0 }}>
        <div style={{
          padding:'10px 12px',
          borderRadius:10,
          background:'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.06) 100%)',
          border:'1px solid rgba(16,185,129,0.15)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span className="live-dot" style={{ background:'#10b981', color:'#10b981' }}/>
            <span style={{
              fontFamily:'var(--font-mono)',
              fontSize:10, fontWeight:700,
              letterSpacing:'0.08em',
              color:'#10b981',
            }}>ALL SYSTEMS LIVE</span>
          </div>
          <div style={{
            fontFamily:'var(--font-mono)',
            fontSize:10,
            color:'rgba(255,255,255,0.22)',
          }}>12 services · localhost</div>
        </div>
      </div>

      {/* ── User footer ────────────────────────────────────── */}
      <div style={{
        padding:'8px 8px 10px',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        flexShrink:0,
      }}>
        <div style={{
          display:'flex',
          alignItems:'center',
          gap:10,
          padding:'10px 10px',
          borderRadius:10,
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width:32, height:32,
            borderRadius:9,
            background:'linear-gradient(135deg, rgba(79,142,247,0.3) 0%, rgba(139,92,246,0.3) 100%)',
            border:'1px solid rgba(79,142,247,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700,
            color:'#7aa8ff',
            flexShrink:0,
          }}>
            {user?.name?.charAt(0) ?? 'A'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:12, fontWeight:600,
              color:'var(--text-1)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>
              {user?.name ?? 'Admin User'}
            </div>
            <div style={{
              fontSize:10,
              color:'rgba(255,255,255,0.25)',
              fontFamily:'var(--font-mono)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>
              {user?.role ?? 'SUPER_ADMIN'}
            </div>
          </div>
          <div style={{ display:'flex', gap:2 }}>
            <button
              style={{
                padding:6, border:'none', background:'transparent',
                cursor:'pointer', borderRadius:7,
                transition:'background 0.15s',
                color:'rgba(255,255,255,0.25)',
              }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
              title="Settings"
            >
              <Settings size={13}/>
            </button>
            <button
              style={{
                padding:6, border:'none', background:'transparent',
                cursor:'pointer', borderRadius:7,
                transition:'background 0.15s',
                color:'rgba(255,255,255,0.25)',
              }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(244,63,94,0.12)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={13}/>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
