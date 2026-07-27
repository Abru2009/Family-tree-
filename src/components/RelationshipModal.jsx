import React, { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { X, Search, GitCommit } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if dateA is strictly before dateB (both YYYY-MM-DD or similar). */
const isBefore = (dateA, dateB) => {
  if (!dateA || !dateB) return null;
  return dateA < dateB;
};

/** Gender shorthand for a member object. */
const g = (member) => (member?.gender === 'female' ? 'f' : 'm');

/** Canonical ancestor title n generations above, given gender. */
const ancestorTitle = (n, gender) => {
  if (n <= 0) return null;
  if (n === 1) return gender === 'f' ? 'Mother' : 'Father';
  if (n === 2) return gender === 'f' ? 'Grandmother' : 'Grandfather';
  if (n === 3) return gender === 'f' ? 'Great-Grandmother' : 'Great-Grandfather';
  return `${'Great-'.repeat(n - 2)}${gender === 'f' ? 'Grandmother' : 'Grandfather'}`;
};

/** Canonical descendant title n generations below, given gender. */
const descendantTitle = (n, gender) => {
  if (n <= 0) return null;
  if (n === 1) return gender === 'f' ? 'Daughter' : 'Son';
  if (n === 2) return gender === 'f' ? 'Granddaughter' : 'Grandson';
  if (n === 3) return gender === 'f' ? 'Great-Granddaughter' : 'Great-Grandson';
  return `${'Great-'.repeat(n - 2)}${gender === 'f' ? 'Granddaughter' : 'Grandson'}`;
};

/** Elder/Younger qualifier: refPerson born before/after targetPerson. */
const ageQualifier = (refPerson, targetPerson) => {
  const before = isBefore(refPerson?.birthDate, targetPerson?.birthDate);
  if (before === true)  return 'Younger'; // ref is elder → target is younger
  if (before === false) return 'Elder';   // ref is younger → target is elder
  return '';
};

/** Sibling label for targetPerson relative to refPerson. */
const siblingLabel = (refPerson, targetPerson) => {
  const age  = ageQualifier(refPerson, targetPerson);
  const word = g(targetPerson) === 'f' ? 'Sister' : 'Brother';
  return age ? `${age} ${word}` : word;
};

// ─────────────────────────────────────────────────────────────────────────────
//  CANONICAL RELATIONSHIP ENGINE
//
//  Strategy:
//  1. Walk the BFS path, treating 'spouse' hops as same-generation connectors.
//  2. Count "parent" hops (upward) and "child" hops (downward).
//  3. The pivot node is the common ancestor where direction reverses.
//  4. Produce the SIMPLEST canonical name using standard family terms.
//
//  Examples:
//    parent → Father/Mother
//    parent+parent → Grandfather/Grandmother
//    parent+spouse+parent → still Grandfather (spouse is transparent)
//    parent+parent+child (sibling of parent) → Uncle/Aunt
//    parent+parent+parent+child (sibling of grandparent) → Grandfather's Elder Sister
//    parent+parent+child+child → First Cousin
// ─────────────────────────────────────────────────────────────────────────────

const getCanonicalRelationship = (path, memberMap) => {
  if (!path || path.length < 2) return 'Same Person';

  const personA = memberMap[path[0].id];
  const personB = memberMap[path[path.length - 1].id];

  // Hops: each entry is { rel, id } for path[1..n]
  const hops = path.slice(1); // [{id, rel}, ...]

  // ── Phase 1: walk upward (parent/spouse) until we hit a 'child' hop ────────
  let genUp = 0;          // count of 'parent' hops in ascent
  let pivotIdx = hops.length; // index in 'hops' where descent starts

  for (let i = 0; i < hops.length; i++) {
    if (hops[i].rel === 'parent') {
      genUp++;
    } else if (hops[i].rel === 'spouse') {
      // same-level connector — do not increment genUp
    } else {
      // first 'child' hop = start of descent
      pivotIdx = i;
      break;
    }
  }

  // ── Phase 2: walk downward — must be only 'child' hops (+ optional spouse) ─
  let genDown = 0;
  let postSpouse = false; // e.g. child + spouse = son/daughter-in-law

  for (let i = pivotIdx; i < hops.length; i++) {
    if (hops[i].rel === 'child') {
      genDown++;
    } else if (hops[i].rel === 'spouse' && i === hops.length - 1) {
      postSpouse = true; // e.g. daughter-in-law
    } else {
      // Complex mixed path — fall back to chained description
      return buildChainedDescription(path, memberMap);
    }
  }

  // ── Special in-law variants detected by hop pattern ─────────────────────────
  const hopTypes = hops.map(h => h.rel).join(',');

  if (hopTypes === 'spouse,parent') return g(personB) === 'f' ? 'Mother-in-law' : 'Father-in-law';
  if (hopTypes === 'spouse,child')  return g(personB) === 'f' ? 'Stepdaughter'  : 'Stepson';
  if (hopTypes === 'child,spouse')  return g(personB) === 'f' ? 'Daughter-in-law' : 'Son-in-law';

  // Sibling's spouse: parent+child+spouse
  if (hopTypes === 'parent,child,spouse') return g(personB) === 'f' ? 'Sister-in-law' : 'Brother-in-law';
  // Spouse's sibling: spouse+parent+child
  if (hopTypes === 'spouse,parent,child') return g(personB) === 'f' ? 'Sister-in-law' : 'Brother-in-law';

  // ── Pure Ascent (no descent) ─────────────────────────────────────────────────
  if (genDown === 0) {
    if (hopTypes === 'spouse') return g(personB) === 'f' ? 'Wife' : 'Husband';
    return ancestorTitle(genUp, g(personB)) ?? 'Distant Ancestor';
  }

  // ── Pure Descent (no ascent) ─────────────────────────────────────────────────
  if (genUp === 0) {
    if (postSpouse) return g(personB) === 'f' ? 'Daughter-in-law' : 'Son-in-law';
    return descendantTitle(genDown, g(personB)) ?? 'Distant Descendant';
  }

  // ── Collateral (both up and down) ────────────────────────────────────────────
  //
  //  The PIVOT NODE is path[path.length - 1 - genDown] (the common ancestor).
  //  The SIBLING ANCHOR is path[pivotPathIdx - 1] — the person in the ascending
  //  chain whose sibling (or cousin) personB is.
  //
  const pivotPathIdx       = path.length - 1 - genDown; // index of pivot in path
  const sibAnchorPathIdx   = pivotPathIdx - 1;           // index of sibling anchor
  const pivotPerson        = memberMap[path[pivotPathIdx]?.id];
  const sibAnchorPerson    = sibAnchorPathIdx >= 0
                               ? memberMap[path[sibAnchorPathIdx].id]
                               : personA;

  // Count ONLY 'parent' hops up to the sibling anchor (not the pivot)
  // = genUp - 1 (since from sibAnchor → pivot is one more parent hop)
  // But what we really need is how many "effective generations" above A the sibAnchor is.
  // The effective generation = number of 'parent' hops from A to sibAnchor.
  let sibAnchorGenLevel = 0;
  for (let i = 0; i < pivotIdx - 1; i++) {   // hops up to (not including) last ascent hop
    if (hops[i].rel === 'parent') sibAnchorGenLevel++;
  }
  // sibAnchorGenLevel is now how many 'parent' hops above A the sibAnchor is.
  // = genUp - 1 (last ascending hop goes from sibAnchor to pivot)

  // ── Sibling (genUp=1, genDown=1) ──────────────────────────────────────────
  if (genUp === 1 && genDown === 1) {
    return siblingLabel(personA, personB);
  }

  // ── Uncle / Aunt (sibAnchor = A's parent) ─────────────────────────────────
  if (genUp === 2 && genDown === 1) {
    // Uncle or Aunt — optionally with elder/younger qualifier
    const qual = ageQualifier(sibAnchorPerson, personB);
    const word = g(personB) === 'f' ? 'Aunt' : 'Uncle';
    return qual ? `${qual} ${word}` : word;
  }

  // ── Nephew / Niece (sibling's child) ──────────────────────────────────────
  if (genUp === 1 && genDown === 2) {
    return g(personB) === 'f' ? 'Niece' : 'Nephew';
  }

  // ── Grandnephew / Grandniece ───────────────────────────────────────────────
  if (genUp === 1 && genDown === 3) {
    return g(personB) === 'f' ? 'Grand-Niece' : 'Grand-Nephew';
  }

  // ── First Cousin ───────────────────────────────────────────────────────────
  if (genUp === 2 && genDown === 2) {
    return 'First Cousin';
  }

  // ── Second Cousin ──────────────────────────────────────────────────────────
  if (genUp === 3 && genDown === 3) {
    return 'Second Cousin';
  }

  // ── Nth Cousin ─────────────────────────────────────────────────────────────
  if (genUp === genDown && genUp > 1) {
    const ordinals = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth'];
    const ord = ordinals[genUp - 1] ?? `${genUp - 1}th`;
    return `${ord} Cousin`;
  }

  // ── Cousin Once/Twice Removed ──────────────────────────────────────────────
  if (genUp === 2 && genDown === 3) return 'First Cousin Once Removed';
  if (genUp === 3 && genDown === 2) return 'First Cousin Once Removed';
  if (genUp === 2 && genDown === 4) return 'First Cousin Twice Removed';
  if (genUp === 4 && genDown === 2) return 'First Cousin Twice Removed';
  if (genUp === 3 && genDown === 4) return 'Second Cousin Once Removed';
  if (genUp === 4 && genDown === 3) return 'Second Cousin Once Removed';

  // ── Grandparent's sibling and beyond (genDown=1, genUp≥3) ─────────────────
  //  e.g. genUp=3, genDown=1 → Grandfather's Elder Sister
  //       genUp=4, genDown=1 → Great-Grandfather's Elder Sister
  if (genDown === 1 && genUp >= 3) {
    // sibAnchor is at (genUp-1) parent hops above A
    const anchorGen = genUp - 1; // how many generations above A the sibAnchor is
    const anchorTitle = ancestorTitle(anchorGen, g(sibAnchorPerson));
    const sib = siblingLabel(sibAnchorPerson, personB);
    return anchorTitle ? `${anchorTitle}'s ${sib}` : sib;
  }

  // ── Grandparent's descendant removed (genUp=2, genDown≥3) ─────────────────
  if (genDown >= 3 && genUp === 2) {
    // sibling's grandchild etc.
    const relDescendant = descendantTitle(genDown - 1, g(personB));
    return relDescendant ? `Nephew/Niece's ${relDescendant}` : 'Distant Relative';
  }

  // ── Fallback: chained description ──────────────────────────────────────────
  return buildChainedDescription(path, memberMap);
};

// ─────────────────────────────────────────────────────────────────────────────
//  CHAINED DESCRIPTION (fallback for unusual paths)
//  Collapses parent→child pairs inline so siblings don't include the pivot.
// ─────────────────────────────────────────────────────────────────────────────

const buildChainedDescription = (path, memberMap) => {
  const personA = memberMap[path[0].id];
  const personB = memberMap[path[path.length - 1].id];
  const parts   = [];
  let i = 1;

  while (i < path.length) {
    const cur = memberMap[path[i].id];
    const rel = path[i].rel;
    const gCur = cur?.gender === 'female' ? 'f' : 'm';

    // ── Sibling collapse: parent + child = sibling ──────────────────────────
    if (rel === 'parent' && i + 1 < path.length && path[i + 1].rel === 'child') {
      const prevPerson = memberMap[path[i - 1].id];
      const sibPerson  = memberMap[path[i + 1].id];
      parts.push(siblingLabel(prevPerson, sibPerson));
      i += 2;
      continue;
    }

    if (rel === 'parent') parts.push(gCur === 'f' ? 'Mother' : 'Father');
    else if (rel === 'child')  parts.push(gCur === 'f' ? 'Daughter' : 'Son');
    else if (rel === 'spouse') parts.push(gCur === 'f' ? 'Wife' : 'Husband');
    i++;
  }

  return parts.length > 0 ? parts.join("'s ") : 'Distant Relative';
};

// ─────────────────────────────────────────────────────────────────────────────
//  STEP LABEL (for the connection path display)
//  type='parent' means the NEXT person (to) is FROM's parent → FROM is son/daughter
//  type='child'  means the NEXT person (to) is FROM's child  → FROM is father/mother
// ─────────────────────────────────────────────────────────────────────────────

const stepLabel = (type, from) => {
  if (type === 'parent') return from?.gender === 'female' ? 'daughter of' : 'son of';
  if (type === 'child')  return from?.gender === 'female' ? 'mother of'   : 'father of';
  if (type === 'spouse') return from?.gender === 'female' ? 'wife of'     : 'husband of';
  return type;
};

// ─────────────────────────────────────────────────────────────────────────────
//  BFS: find shortest path between two members
// ─────────────────────────────────────────────────────────────────────────────

const findRelationship = (members, relations, startId, endId) => {
  if (!startId || !endId) return null;
  if (startId === endId) return { title: 'Same Person', relLabel: '', steps: [] };

  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  // Build adjacency
  const adj = {};
  members.forEach(m => { adj[m.id] = []; });

  relations.forEach(r => {
    if (r.type === 'spouse') {
      adj[r.source]?.push({ neighbor: r.target, type: 'spouse' });
      adj[r.target]?.push({ neighbor: r.source, type: 'spouse' });
    } else if (r.type === 'child') {
      // source = parent, target = child
      adj[r.source]?.push({ neighbor: r.target, type: 'child' });
      adj[r.target]?.push({ neighbor: r.source, type: 'parent' });
    }
  });

  // BFS
  const queue   = [[{ id: startId, rel: null }]];
  const visited = new Set([startId]);
  let found = null;

  while (queue.length > 0) {
    const path = queue.shift();
    const cur  = path[path.length - 1];

    if (cur.id === endId) { found = path; break; }

    for (const edge of (adj[cur.id] || [])) {
      if (!visited.has(edge.neighbor)) {
        visited.add(edge.neighbor);
        queue.push([...path, { id: edge.neighbor, rel: edge.type }]);
      }
    }
  }

  if (!found) return { title: 'No Connection Found', relLabel: '', steps: [] };

  const personA = memberMap[startId];
  const personB = memberMap[endId];

  // Build step list for path display
  const steps = [];
  for (let i = 1; i < found.length; i++) {
    steps.push({
      from: memberMap[found[i - 1].id],
      to:   memberMap[found[i].id],
      type: found[i].rel,
    });
  }

  // Get the canonical relationship label
  const relLabel = getCanonicalRelationship(found, memberMap);
  const title    = `${personB.name} is ${personA.name}'s ${relLabel}`;

  return { personA, personB, title, relLabel, steps };
};

// ─────────────────────────────────────────────────────────────────────────────
//  SIDE PANEL COMPONENT
//  Slides in from the right — tree stays fully visible behind it.
// ─────────────────────────────────────────────────────────────────────────────

const RelationshipModal = ({ onClose }) => {
  const { data } = useFamily();
  const [personAId, setPersonAId] = useState(data.members[0]?.id || '');
  const [personBId, setPersonBId] = useState(data.members[1]?.id || '');

  const result = findRelationship(data.members, data.relations, personAId, personBId);

  return (
    <>
      {/* Floating Side Panel (non-blocking for rest of canvas) */}
      <div
        className="glass"
        style={{
          position: 'fixed',
          top: 16, right: 16, bottom: 16,
          width: '350px',
          zIndex: 900,
          display: 'flex', flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '-4px 8px 36px rgba(0,0,0,0.22)',
          animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        {/* Panel header */}
        <div style={{
          padding: '20px 20px 14px',
          borderBottom: '1px solid rgba(69,183,174,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{
            fontSize: '1.05rem', fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', gap: 8, margin: 0,
          }}>
            <Search size={18} color="var(--accent-color)" />
            Find Relationship
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(69,183,174,0.1)',
            border: '1px solid rgba(69,183,174,0.2)',
            borderRadius: 8, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', cursor: 'pointer',
            transition: 'background 0.2s',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Person selectors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="label">Person A</label>
              <select className="input" value={personAId}
                onChange={e => setPersonAId(e.target.value)}>
                {data.members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Person B</label>
              <select className="input" value={personBId}
                onChange={e => setPersonBId(e.target.value)}>
                {data.members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={{
              background: 'rgba(69,183,174,0.08)',
              border: '1.5px solid rgba(69,183,174,0.25)',
              borderRadius: 14, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>

              {/* Canonical relationship title */}
              <p style={{
                fontSize: '0.98rem', fontWeight: 700,
                color: 'var(--accent-color)', lineHeight: 1.4, margin: 0,
              }}>
                {result.title}
              </p>

              {/* Relationship pill */}
              {result.relLabel && result.steps.length > 0 && (
                <span style={{
                  display: 'inline-block', alignSelf: 'flex-start',
                  background: 'rgba(69,183,174,0.18)',
                  border: '1px solid rgba(69,183,174,0.4)',
                  color: 'var(--accent-color)',
                  borderRadius: 20, padding: '2px 10px',
                  fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.4px',
                }}>
                  {result.relLabel}
                </span>
              )}

              {/* Connection path */}
              {result.steps.length > 0 && (
                <div>
                  <p style={{
                    fontSize: '0.72rem', color: 'var(--text-secondary)',
                    fontWeight: 700, marginBottom: 8, margin: '0 0 8px',
                    textTransform: 'uppercase', letterSpacing: '0.6px',
                  }}>
                    Connection Path
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.steps.map((s, i) => (
                      <div key={i} style={{
                        fontSize: '0.82rem', color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center',
                        flexWrap: 'wrap', gap: '4px 6px',
                      }}>
                        <GitCommit size={12} color="var(--accent-color)" style={{ flexShrink: 0 }} />
                        <strong style={{ whiteSpace: 'nowrap' }}>{s.from.name}</strong>
                        <span style={{
                          color: 'var(--text-secondary)', fontSize: '0.72rem',
                          background: 'rgba(69,183,174,0.12)',
                          padding: '1px 6px', borderRadius: 8, whiteSpace: 'nowrap',
                        }}>
                          {stepLabel(s.type, s.from)}
                        </span>
                        <strong style={{ whiteSpace: 'nowrap' }}>{s.to.name}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default RelationshipModal;
