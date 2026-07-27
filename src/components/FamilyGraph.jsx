import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  useNodes,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import PersonNode from './PersonNode';
import CoupleNode, { COUPLE_NODE_W, PERSON_NODE_W, NODE_H } from './CoupleNode';
import { useFamily } from '../FamilyContext';
import { useAuth } from '../AuthContext';
import { Search, User, LogOut, Lock, Trash2 } from 'lucide-react';

const nodeTypes = { person: PersonNode, couple: CoupleNode };

// Helper to find exact top-center X coordinate for a specific member
const getMemberTopCenterX = (memberId, node) => {
  if (node.type === 'couple') {
    if (node.data.husband?.id === memberId) {
      return node.position.x + 110; // Husband card center
    }
    if (node.data.wife?.id === memberId) {
      return node.position.x + 370; // Wife card center
    }
  }
  return node.position.x + 110; // Single person card center
};

// Helper to find bottom-center X coordinate for a parent node
const getParentBottomCenterX = (node) => {
  if (node.type === 'couple') {
    return node.position.x + 240; // Center between husband and wife
  }
  return node.position.x + 110; // Center of single person card
};

// ─── Build React Flow nodes + memberToNodeId map ───────────────────────────
const buildNodes = (members, relations, handlers) => {
  const spouseRels = relations.filter(r => r.type === 'spouse');

  // Map: memberId → partnerId
  const partnerOf = {};
  spouseRels.forEach(r => {
    partnerOf[r.source] = r.target;
    partnerOf[r.target] = r.source;
  });

  const memberToNodeId = {};  // memberId → rfNodeId
  const processedKeys  = new Set();
  const rfNodes        = [];

  members.forEach(member => {
    const partnerId = partnerOf[member.id];
    const partner   = partnerId ? members.find(m => m.id === partnerId) : null;

    if (partner) {
      const key = [member.id, partnerId].sort().join('|');
      if (processedKeys.has(key)) return;          // already handled
      processedKeys.add(key);

      // Husband (male) on the left
      const husband = member.gender === 'male' ? member : partner;
      const wife    = member.gender === 'male' ? partner : member;
      const nodeId  = `couple_${key}`;

      memberToNodeId[husband.id] = nodeId;
      memberToNodeId[wife.id]    = nodeId;

      rfNodes.push({
        id: nodeId,
        type: 'couple',
        position: { x: 0, y: 0 },
        draggable: true,                           // Draggable horizontally
        selectable: true,
        data: { husband, wife, ...handlers },
        style: { background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' },
      });
    } else {
      // Unmarried person
      memberToNodeId[member.id] = member.id;
      rfNodes.push({
        id: member.id,
        type: 'person',
        position: { x: 0, y: 0 },
        draggable: true,                           // Draggable horizontally
        selectable: true,
        data: { ...member, ...handlers },
        style: { background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' },
      });
    }
  });

  return { rfNodes, memberToNodeId };
};

const MIN_GAP = 70;

// ─── Layout: Strict 100% Collision-Free Algorithm ──────────────────────────
const layoutNodes = (rfNodes, childEdges) => {
  if (!rfNodes || rfNodes.length === 0) return [];

  // Default positions upfront for complete crash safety
  const nodePosMap = {};
  const genOf      = {};
  rfNodes.forEach((n, i) => {
    nodePosMap[n.id] = { x: i * (PERSON_NODE_W + MIN_GAP), y: 0 };
    genOf[n.id]      = 0;
  });

  try {
    // 1. Assign generations (BFS from root nodes)
    const childTargets = new Set(childEdges.map(e => e.target));
    const roots        = rfNodes.map(n => n.id).filter(id => !childTargets.has(id));
    const q     = (roots.length > 0 ? roots : [rfNodes[0].id]).map(id => { genOf[id] = 0; return id; });

    let safety = 0;
    while (q.length > 0 && safety < 2000) {
      safety++;
      const cur = q.shift();
      childEdges.filter(e => e.source === cur).forEach(e => {
        const next = Math.max(genOf[e.target] ?? 0, (genOf[cur] ?? 0) + 1);
        if (genOf[e.target] !== next) { genOf[e.target] = next; q.push(e.target); }
      });
    }

    rfNodes.forEach(n => {
      if (genOf[n.id] === undefined) genOf[n.id] = 0;
    });

    // 2. Map parent of each node
    const parentOf = {};
    childEdges.forEach(e => { parentOf[e.target] = e.source; });

    // 3. Helper to get birthDate for sorting
    const getBirthDate = (n) => {
      if (n.type === 'couple') return n.data.husband?.birthDate || n.data.wife?.birthDate || '';
      return n.data.birthDate || '';
    };

    // 4. Group nodes by generation
    const nodesByGen = {};
    rfNodes.forEach(n => {
      const g = genOf[n.id] ?? 0;
      (nodesByGen[g] = nodesByGen[g] || []).push(n);
    });

    const genKeys = Object.keys(nodesByGen).map(Number);
    const maxGen  = genKeys.length ? Math.max(...genKeys) : 0;

    // 5. Initial left-to-right placement pass per generation
    for (let g = 0; g <= maxGen; g++) {
      const genNodes = nodesByGen[g] || [];
      if (!genNodes.length) continue;

      genNodes.sort((a, b) => {
        const pA = parentOf[a.id] || '';
        const pB = parentOf[b.id] || '';
        if (pA !== pB) return pA.localeCompare(pB);
        const bA = getBirthDate(a);
        const bB = getBirthDate(b);
        if (!bA && !bB) return 0;
        if (!bA) return 1;
        if (!bB) return -1;
        return bA < bB ? -1 : 1;
      });

      let currentX = 0;
      const yPos   = g * (NODE_H + 180);

      genNodes.forEach(n => {
        const w = n.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
        nodePosMap[n.id] = { x: currentX, y: yPos };
        currentX += w + MIN_GAP;
      });
    }

    // 6. Parent centering pass (bottom-up adjustment)
    for (let g = maxGen - 1; g >= 0; g--) {
      const genNodes = nodesByGen[g] || [];
      genNodes.forEach(pn => {
        const children = rfNodes.filter(n => parentOf[n.id] === pn.id);
        if (children.length > 0) {
          const childXs = children.map(c => {
            const cw = c.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
            const pos = nodePosMap[c.id] || { x: 0 };
            return { left: pos.x, right: pos.x + cw };
          });
          const minChildX     = Math.min(...childXs.map(c => c.left));
          const maxChildRight = Math.max(...childXs.map(c => c.right));
          const childrenCenterX = (minChildX + maxChildRight) / 2;

          const pw = pn.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
          if (nodePosMap[pn.id]) {
            nodePosMap[pn.id].x = childrenCenterX - pw / 2;
          }
        }
      });

      genNodes.sort((a, b) => (nodePosMap[a.id]?.x || 0) - (nodePosMap[b.id]?.x || 0));
      for (let i = 1; i < genNodes.length; i++) {
        const prev  = genNodes[i - 1];
        const cur   = genNodes[i];
        const prevW = prev.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
        const prevX = nodePosMap[prev.id]?.x || 0;
        const curX  = nodePosMap[cur.id]?.x || 0;
        const minX  = prevX + prevW + MIN_GAP;
        if (curX < minX && nodePosMap[cur.id]) {
          nodePosMap[cur.id].x = minX;
        }
      }
    }
  } catch (err) {
    console.error('Layout error:', err);
  }

  // 7. Map back to layoutedNodes with generation data
  const laid = rfNodes.map(n => {
    const gen = (genOf[n.id] ?? 0) + 1;
    return {
      ...n,
      position: {
        x: nodePosMap[n.id]?.x || 0,
        y: nodePosMap[n.id]?.y || 0,
      },
      data: {
        ...n.data,
        generation: gen,
      },
    };
  });

  // 8. Centre entire tree horizontally
  const allX = laid.map(n => n.position.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX.map((x, i) => {
    const n = laid[i];
    return x + (n.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W);
  }));
  const offsetX = -((minX + maxX) / 2);
  laid.forEach(n => { n.position.x += offsetX; });

  return laid;
};

// ─── T-Bar SVG Overlay ─────────────────────────────────────────────────────
const FamilyConnections = ({ relations, members }) => {
  const nodes = useNodes();
  const { x: vpX, y: vpY, zoom } = useViewport();

  const lines = useMemo(() => {
    const childRels = relations.filter(r => r.type !== 'spouse');

    // Build member -> node lookup
    const memberNodeOf = {};
    nodes.forEach(n => {
      if (n.type === 'couple') {
        memberNodeOf[n.data.husband.id] = n;
        memberNodeOf[n.data.wife.id]    = n;
      } else {
        memberNodeOf[n.data.id] = n;
      }
    });

    // Group child relations by parentNodeId
    const familyUnits = {}; // parentNodeId -> array of rel objects
    childRels.forEach(rel => {
      const parentNode = memberNodeOf[rel.source];
      const childNode  = memberNodeOf[rel.target];
      if (!parentNode || !childNode) return;
      if (parentNode.id === childNode.id) return; // ignore self-loops
      (familyUnits[parentNode.id] = familyUnits[parentNode.id] || []).push(rel);
    });

    const toScreen = (fx, fy) => ({ x: fx * zoom + vpX, y: fy * zoom + vpY });

    const STROKE = '#45b7ae';
    const SW     = Math.max(2, 2.5 * zoom);

    const result = [];

    Object.entries(familyUnits).forEach(([parentNodeId, rels]) => {
      const parentNode = nodes.find(n => n.id === parentNodeId);
      if (!parentNode) return;

      const pCx = getParentBottomCenterX(parentNode);
      const pBy = parentNode.position.y + NODE_H;

      // Map each child relation to its exact target card top-center X
      const childTops = rels.map(rel => {
        const childMemberId = rel.target;
        const childNode     = memberNodeOf[childMemberId];
        if (!childNode) return null;
        const cx = getMemberTopCenterX(childMemberId, childNode);
        return { cx, ty: childNode.position.y };
      }).filter(Boolean);

      if (!childTops.length) return;

      const childTopY = Math.min(...childTops.map(c => c.ty));
      const jY        = (pBy + childTopY) / 2; // junction Y

      const allXPoints = [...childTops.map(c => c.cx), pCx];
      const minX = Math.min(...allXPoints);
      const maxX = Math.max(...allXPoints);

      // 1. Vertical drop from parent bottom handle dot center
      const pB = toScreen(pCx, pBy + 4);
      const jC = toScreen(pCx, jY);
      result.push({ x1: pB.x, y1: pB.y, x2: jC.x, y2: jC.y });

      // 2. Horizontal T-bar at junction
      if (minX < maxX) {
        const L = toScreen(minX, jY);
        const R = toScreen(maxX, jY);
        result.push({ x1: L.x, y1: L.y, x2: R.x, y2: R.y });
      }

      // 3. Vertical drop from junction to child top handle dot center (stops dead at dot center)
      childTops.forEach(({ cx, ty }) => {
        const Jpt = toScreen(cx, jY);
        const Tpt = toScreen(cx, ty - 4);
        result.push({ x1: Jpt.x, y1: Jpt.y, x2: Tpt.x, y2: Tpt.y });
      });
    });

    return { lines: result, STROKE, SW };
  }, [nodes, relations, zoom, vpX, vpY]);

  if (!lines.lines.length) return null;

  return (
    <svg style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {lines.lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={lines.STROKE}
          strokeWidth={lines.SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};

// ─── Generation Swimlanes Overlay ─────────────────────────────────────────────
const GenerationRuler = ({ isRelationshipOpen }) => {
  const nodes = useNodes();
  const { x: vpX, y: vpY, zoom } = useViewport();

  // Group nodes by generation to find row Y positions
  const genRows = useMemo(() => {
    const rows = {};
    nodes.forEach(n => {
      const g = n.data?.generation;
      if (g !== undefined) {
        if (!rows[g] || n.position.y < rows[g].y) {
          rows[g] = { generation: g, y: n.position.y };
        }
      }
    });
    return Object.values(rows).sort((a, b) => a.generation - b.generation);
  }, [nodes]);

  const rightPos = isRelationshipOpen ? 380 : 24;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6 }}>
      {genRows.map(({ generation, y }) => {
        const screenY = y * zoom + vpY;
        return (
          <div key={generation} style={{ position: 'absolute', top: screenY - 26 * zoom, right: rightPos, transition: 'right 0.25s ease', pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(69, 183, 174, 0.35)',
              color: 'var(--accent-color)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#45b7ae' }} />
              Gen {generation}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const FamilyGraph = ({ onAddRelative, onAddRoot, onUpdateMember, onRemoveConnections, onOpenRelationshipModal, isRelationshipOpen }) => {
  const { data, deleteMember, addRelation, clearTree } = useFamily();
  const { currentUser, openAuthModal, signOut } = useAuth();
  const [isLocked, setIsLocked] = React.useState(false); // Controls if screen panning/zooming is frozen
  const [showInfo, setShowInfo] = React.useState(true);   // Can dismiss info banner

  const handlers = useMemo(() => ({
    onAddRelative,
    onUpdateMember,
    onRemoveConnections,
    onDelete: deleteMember,
  }), [onAddRelative, onUpdateMember, onRemoveConnections, deleteMember]);

  // Build RF nodes + the memberId -> nodeId mapping
  const { rfNodes, memberToNodeId } = useMemo(
    () => buildNodes(data.members, data.relations, handlers),
    [data.members, data.relations, handlers]
  );

  // Parent-child edges (translated to node IDs)
  const childEdgesForLayout = useMemo(() => {
    const seen = new Set();
    return data.relations
      .filter(r => r.type !== 'spouse')
      .map(r => ({
        source: memberToNodeId[r.source],
        target: memberToNodeId[r.target],
      }))
      .filter(e => {
        if (!e.source || !e.target || e.source === e.target) return false;
        const key = `${e.source}|${e.target}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [data.relations, memberToNodeId]);

  // Run layout
  const layoutedNodes = useMemo(
    () => layoutNodes(rfNodes, childEdgesForLayout),
    [rfNodes, childEdgesForLayout]
  );

  // No React Flow edges — connections are drawn by the SVG overlay
  const rfEdges = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  const onConnect = React.useCallback((connection) => {
    const { source, target, sourceHandle, targetHandle } = connection;
    const getMemberId = (nodeId, handleId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return nodeId;
      if (node.type === 'couple') {
        if (handleId === 'top-wife') return node.data.wife.id;
        if (handleId === 'top-husband') return node.data.husband.id;
        return node.data.husband.id;
      }
      return node.data.id;
    };

    const srcMemberId = getMemberId(source, sourceHandle);
    const tgtMemberId = getMemberId(target, targetHandle);

    let relType = 'child';
    if ((sourceHandle === 'left' || sourceHandle === 'right') && (targetHandle === 'left' || targetHandle === 'right')) {
      relType = 'spouse';
    }

    addRelation(srcMemberId, tgtMemberId, relType);
  }, [nodes, addRelation]);

  // Strictly horizontal dragging handler (locks Y coordinate to current row Y)
  const handleNodesChange = React.useCallback((changes) => {
    const horizontalChanges = changes.map(change => {
      if (change.type === 'position' && change.position) {
        const currentNode = nodes.find(n => n.id === change.id);
        if (currentNode) {
          return {
            ...change,
            position: {
              x: change.position.x,
              y: currentNode.position.y,
            },
          };
        }
      }
      return change;
    });
    onNodesChange(horizontalChanges);
  }, [nodes, onNodesChange]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {data.members.length === 0 ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Your family tree is empty</h2>
          <button className="btn" onClick={onAddRoot} style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
            + Start Family Tree
          </button>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          nodesDraggable={!isLocked}
          nodesConnectable={true}
          panOnDrag={!isLocked}
          panOnScroll={!isLocked}
          zoomOnScroll={!isLocked}
          zoomOnPinch={!isLocked}
          zoomOnDoubleClick={!isLocked}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.08}
          proOptions={{ hideAttribution: true }}
        >
          <FamilyConnections relations={data.relations} members={data.members} />
          <GenerationRuler isRelationshipOpen={isRelationshipOpen} />
          <Background color="#45b7ae" gap={28} size={1} variant="dots" style={{ opacity: 0.12 }} />
          <Controls
            position="bottom-left"
            style={{ margin: 16 }}
            showInteractive={true}
            onInteractiveChange={(interactive) => setIsLocked(!interactive)}
          />
          <Panel position="top-left" style={{ margin: 16 }}>
            <div className="glass-panel" style={{
              padding: '14px 18px',
              color: 'var(--text-primary)',
              width: 270,
              boxShadow: '0 4px 16px rgba(69,183,174,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {/* Header row with title + Hide button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>🌿 Family Tree</span>
                <button
                  onClick={() => setShowInfo(v => !v)}
                  style={{
                    background: 'rgba(69,183,174,0.12)',
                    border: '1px solid rgba(69,183,174,0.3)',
                    borderRadius: 6,
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                  }}
                  title={showInfo ? 'Hide instructions' : 'Show instructions'}
                >
                  {showInfo ? '▲ Hide' : 'ℹ️ Info'}
                </button>
              </div>

              {/* User Account Status Badge */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'rgba(69, 183, 174, 0.08)',
                border: '1px solid rgba(69, 183, 174, 0.25)',
                borderRadius: 8,
                fontSize: '0.76rem',
              }}>
                {currentUser ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden' }}>
                      <User size={13} color="var(--accent-color)" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{currentUser.name}</span>
                    </div>
                    <button
                      onClick={signOut}
                      style={{
                        background: 'none', border: 'none',
                        color: '#f87171', cursor: 'pointer',
                        fontSize: '0.72rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                      title="Sign out of your account"
                    >
                      <LogOut size={12} /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--text-secondary)' }}>Guest Account</span>
                    <button
                      onClick={openAuthModal}
                      style={{
                        background: 'var(--accent-color)', border: 'none',
                        borderRadius: 6, color: 'white',
                        padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Lock size={11} /> Sign In
                    </button>
                  </>
                )}
              </div>

              {/* Buttons row */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onAddRelative('ROOT')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    background: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  title="Add a new standalone person tile"
                >
                  + Add Person
                </button>

                <button
                  onClick={onOpenRelationshipModal}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    background: 'rgba(69,183,174,0.12)',
                    color: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  title="Find relationship between two family members"
                >
                  <Search size={13} /> Relationship
                </button>
              </div>

              {/* Instructions section (collapsible) */}
              {showInfo && (
                <div style={{ paddingTop: 6, borderTop: '1px solid rgba(69,183,174,0.15)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                    • Pan & zoom to explore.<br />
                    • Click ⋮ on a person to add or edit.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all members to start building your big family tree?')) {
                        clearTree();
                      }
                    }}
                    style={{
                      padding: '5px 8px', fontSize: '0.72rem', fontWeight: 600,
                      borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      marginTop: 2,
                    }}
                    title="Clear current tree to build a new one from scratch"
                  >
                    <Trash2 size={12} /> Clear Board (New Tree)
                  </button>
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      )}
    </div>
  );
};

export default FamilyGraph;
