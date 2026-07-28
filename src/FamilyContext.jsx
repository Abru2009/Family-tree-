import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

const FamilyContext = createContext();

// ─── Default member shape (all optional fields) ──────────────────────────────
const defaultMember = {
  name: '', gender: 'male', birthDate: '', deathDate: '',
  photo: null,
  phone: '', email: '', social: '', address: '', location: '',
  occupation: '', company: '', heritage: '', notes: '',
};

const initialData = {
  members: [{ ...defaultMember, id: '1', name: 'John Doe', gender: 'male' }],
  relations: [],
};

const MAX_HISTORY = 60;

export const FamilyProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const storageKey = useCallback(
    (uid) => uid ? `familyTreeData_usr_${uid}` : 'familyTreeData',
    []
  );
  const posKey = useCallback(
    (uid) => uid ? `familyTreePos_usr_${uid}` : 'familyTreePos',
    []
  );

  // ── Load from localStorage ─────────────────────────────────────────────────
  const loadData = (uid) => {
    try {
      const saved = localStorage.getItem(storageKey(uid));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.relations)) {
          const validIds = new Set(parsed.members.map(m => m.id));
          return {
            members: parsed.members.map(m => ({ ...defaultMember, ...m })),
            relations: parsed.relations.filter(r => validIds.has(r.source) && validIds.has(r.target)),
          };
        }
      }
    } catch (e) { console.error('Error reading localStorage:', e); }
    return initialData;
  };

  const [data, setDataRaw] = useState(() => loadData(currentUser?.id));

  // ── Undo / Redo history ───────────────────────────────────────────────────
  const historyRef = useRef([]);   // stack of past states (oldest first)
  const futureRef  = useRef([]);   // stack of undone states

  const setData = useCallback((updater) => {
    setDataRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Push prev onto history, clear future
      historyRef.current = [...historyRef.current, prev].slice(-MAX_HISTORY);
      futureRef.current  = [];
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    setDataRaw(prev => {
      const past    = [...historyRef.current];
      const reverted = past.pop();
      historyRef.current = past;
      futureRef.current  = [prev, ...futureRef.current].slice(0, MAX_HISTORY);
      return reverted;
    });
  }, []);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    setDataRaw(prev => {
      const [next, ...rest] = futureRef.current;
      futureRef.current  = rest;
      historyRef.current = [...historyRef.current, prev].slice(-MAX_HISTORY);
      return next;
    });
  }, []);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  // ── Re-load tree when user changes ───────────────────────────────────────
  useEffect(() => {
    const next = loadData(currentUser?.id);
    historyRef.current = [];
    futureRef.current  = [];
    setDataRaw(next);
  }, [currentUser?.id]);

  // ── Persist tree state ────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(storageKey(currentUser?.id), JSON.stringify(data));
  }, [data, currentUser?.id]);

  // ── Tile positions (separate from tree data for undo independence) ─────────
  const [nodePositions, setNodePositionsRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(posKey(currentUser?.id));
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(posKey(currentUser?.id));
      setNodePositionsRaw(saved ? JSON.parse(saved) : {});
    } catch { setNodePositionsRaw({}); }
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem(posKey(currentUser?.id), JSON.stringify(nodePositions));
  }, [nodePositions, currentUser?.id]);

  const saveNodePosition = useCallback((nodeId, pos) => {
    setNodePositionsRaw(prev => ({ ...prev, [nodeId]: pos }));
  }, []);

  // ── Heritage colours ────────────────────────────────────────────────────
  const [heritageColors, setHeritageColorsRaw] = useState(() => {
    try {
      const saved = localStorage.getItem('familyHeritageColors');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const saveHeritageColor = useCallback((name, color) => {
    setHeritageColorsRaw(prev => {
      const next = { ...prev, [name]: color };
      localStorage.setItem('familyHeritageColors', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Heritage visibility filter ────────────────────────────────────────────
  const [hiddenHeritages, setHiddenHeritages] = useState(new Set());
  const toggleHeritageVisibility = useCallback((name) => {
    setHiddenHeritages(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  // ── CRUD actions ─────────────────────────────────────────────────────────
  const clearTree = () => {
    const empty = { members: [], relations: [] };
    historyRef.current = [];
    futureRef.current  = [];
    setDataRaw(empty);
    localStorage.setItem(storageKey(currentUser?.id), JSON.stringify(empty));
    setNodePositionsRaw({});
    localStorage.setItem(posKey(currentUser?.id), JSON.stringify({}));
  };

  const addMember = (member, relationType, relatedToId) => {
    const newId = uuidv4();
    const newMember = { ...defaultMember, ...member, id: newId };
    setData(prev => {
      const newMembers  = [...prev.members, newMember];
      let newRelations  = [...prev.relations];
      if (relationType && relatedToId) {
        if (relationType === 'child') {
          newRelations.push({ id: uuidv4(), source: relatedToId, target: newId, type: 'child' });
        } else if (relationType === 'parent') {
          newRelations.push({ id: uuidv4(), source: newId, target: relatedToId, type: 'child' });
        } else if (relationType === 'spouse') {
          newRelations.push({ id: uuidv4(), source: relatedToId, target: newId, type: 'spouse' });
        } else if (relationType === 'sibling') {
          const parentRels = prev.relations.filter(r => r.target === relatedToId && r.type !== 'spouse');
          if (parentRels.length > 0) {
            parentRels.forEach(pr => newRelations.push({ id: uuidv4(), source: pr.source, target: newId, type: 'child' }));
          } else {
            const placeholderId = uuidv4();
            const relMember = prev.members.find(m => m.id === relatedToId);
            newMembers.push({ ...defaultMember, id: placeholderId, name: `Parent of ${relMember?.name || 'Sibling'}`, gender: 'male' });
            newRelations.push({ id: uuidv4(), source: placeholderId, target: relatedToId, type: 'child' });
            newRelations.push({ id: uuidv4(), source: placeholderId, target: newId, type: 'child' });
          }
        }
      }
      return { members: newMembers, relations: newRelations };
    });
    return newId;
  };

  // Bulk add multiple children to a parent at once
  const addBulkChildren = (parentId, children) => {
    setData(prev => {
      const newMembers   = [...prev.members];
      const newRelations = [...prev.relations];
      children.forEach(child => {
        const childId = uuidv4();
        newMembers.push({ ...defaultMember, ...child, id: childId });
        newRelations.push({ id: uuidv4(), source: parentId, target: childId, type: 'child' });
      });
      return { members: newMembers, relations: newRelations };
    });
  };

  const addParents = (fatherData, motherData, childId) => {
    const fatherId = uuidv4();
    const motherId = uuidv4();
    setData(prev => ({
      members: [
        ...prev.members,
        { ...defaultMember, ...fatherData, id: fatherId, gender: 'male' },
        { ...defaultMember, ...motherData, id: motherId, gender: 'female' },
      ],
      relations: [
        ...prev.relations,
        { id: uuidv4(), source: fatherId, target: childId,  type: 'child'  },
        { id: uuidv4(), source: motherId, target: childId,  type: 'child'  },
        { id: uuidv4(), source: fatherId, target: motherId, type: 'spouse' },
      ],
    }));
  };

  const updateMember = (id, updates) => {
    setData(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  };

  const deleteMember = (id) => {
    setData(prev => ({
      ...prev,
      members:   prev.members.filter(m => m.id !== id),
      relations: prev.relations.filter(r => r.source !== id && r.target !== id),
    }));
    // Clean up saved position for deleted node
    setNodePositionsRaw(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addRelation = (sourceId, targetId, relationType) => {
    setData(prev => {
      const exists = prev.relations.some(
        r => (r.source === sourceId && r.target === targetId && r.type === relationType) ||
             (r.source === targetId && r.target === sourceId && r.type === relationType)
      );
      if (exists) return prev;
      return { ...prev, relations: [...prev.relations, { id: uuidv4(), source: sourceId, target: targetId, type: relationType }] };
    });
  };

  const deleteRelation = (relationId) => {
    setData(prev => ({ ...prev, relations: prev.relations.filter(r => r.id !== relationId) }));
  };

  const removeRelationBetween = (memberAId, memberBId) => {
    setData(prev => ({
      ...prev,
      relations: prev.relations.filter(
        r => !((r.source === memberAId && r.target === memberBId) || (r.source === memberBId && r.target === memberAId))
      ),
    }));
  };

  // ── Derive all heritages from current members ─────────────────────────────
  const allHeritages = [...new Set(data.members.map(m => m.heritage).filter(Boolean))].sort();

  return (
    <FamilyContext.Provider value={{
      data, addMember, addBulkChildren, addParents, addRelation,
      deleteRelation, removeRelationBetween, updateMember, deleteMember, clearTree,
      undo, redo, canUndo, canRedo,
      nodePositions, saveNodePosition,
      heritageColors, saveHeritageColor,
      hiddenHeritages, toggleHeritageVisibility, allHeritages,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);
