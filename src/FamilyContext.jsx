import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

const FamilyContext = createContext();

const initialData = {
  members: [
    { id: '1', name: 'John Doe', gender: 'male', birthDate: '', relationToRoot: 'Root' }
  ],
  relations: [] // { id: 'r1', source: '1', target: '2', type: 'child|spouse' }
};

export const FamilyProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const [data, setData] = useState(() => {
    try {
      const key = currentUser ? `familyTreeData_usr_${currentUser.id}` : 'familyTreeData';
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.relations)) {
          const validMemberIds = new Set(parsed.members.map(m => m.id));
          const cleanRelations = parsed.relations.filter(
            r => validMemberIds.has(r.source) && validMemberIds.has(r.target)
          );
          return { members: parsed.members, relations: cleanRelations };
        }
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
    return initialData;
  });

  // Re-load tree when active logged-in user changes
  useEffect(() => {
    try {
      const key = currentUser ? `familyTreeData_usr_${currentUser.id}` : 'familyTreeData';
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.relations)) {
          const validMemberIds = new Set(parsed.members.map(m => m.id));
          const cleanRelations = parsed.relations.filter(
            r => validMemberIds.has(r.source) && validMemberIds.has(r.target)
          );
          setData({ members: parsed.members, relations: cleanRelations });
          return;
        }
      }
    } catch (e) {
      console.error('Error switching user tree:', e);
    }
    setData(initialData);
  }, [currentUser?.id]);

  // Persist tree state
  useEffect(() => {
    const key = currentUser ? `familyTreeData_usr_${currentUser.id}` : 'familyTreeData';
    localStorage.setItem(key, JSON.stringify(data));
  }, [data, currentUser?.id]);

  const clearTree = () => {
    const emptyData = { members: [], relations: [] };
    setData(emptyData);
    const key = currentUser ? `familyTreeData_usr_${currentUser.id}` : 'familyTreeData';
    localStorage.setItem(key, JSON.stringify(emptyData));
  };

  const addMember = (member, relationType, relatedToId) => {
    const newMemberId = uuidv4();
    const newMember = { ...member, id: newMemberId };
    
    setData(prev => {
      const newMembers = [...prev.members, newMember];
      let newRelations = [...prev.relations];
      
      if (relationType && relatedToId) {
        if (relationType === 'child') {
          // relatedToId is the parent
          newRelations.push({ id: uuidv4(), source: relatedToId, target: newMemberId, type: 'child' });
        } else if (relationType === 'parent') {
          // relatedToId is the child
          newRelations.push({ id: uuidv4(), source: newMemberId, target: relatedToId, type: 'child' });
        } else if (relationType === 'spouse') {
          newRelations.push({ id: uuidv4(), source: relatedToId, target: newMemberId, type: 'spouse' });
        } else if (relationType === 'sibling') {
          // Find parents of relatedToId
          const parentRels = prev.relations.filter(r => r.target === relatedToId && r.type !== 'spouse');
          if (parentRels.length > 0) {
            parentRels.forEach(pr => {
              newRelations.push({ id: uuidv4(), source: pr.source, target: newMemberId, type: 'child' });
            });
          } else {
            // Create a shared parent so siblings group under the same parent node
            const placeholderParentId = uuidv4();
            const relMember = prev.members.find(m => m.id === relatedToId);
            newMembers.push({
              id: placeholderParentId,
              name: `Parent of ${relMember?.name || 'Sibling'}`,
              gender: 'male',
              birthDate: '',
            });
            newRelations.push({ id: uuidv4(), source: placeholderParentId, target: relatedToId, type: 'child' });
            newRelations.push({ id: uuidv4(), source: placeholderParentId, target: newMemberId, type: 'child' });
          }
        }
      }
      return { members: newMembers, relations: newRelations };
    });
  };

  // Creates both parents at once with a spouse relation between them
  const addParents = (fatherData, motherData, childId) => {
    const fatherId = uuidv4();
    const motherId = uuidv4();
    setData(prev => ({
      members: [
        ...prev.members,
        { ...fatherData, id: fatherId, gender: 'male' },
        { ...motherData, id: motherId, gender: 'female' },
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
      members: prev.members.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  };

  const deleteMember = (id) => {
    setData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id),
      relations: prev.relations.filter(r => r.source !== id && r.target !== id)
    }));
  };

  const addRelation = (sourceId, targetId, relationType) => {
    setData(prev => {
      const exists = prev.relations.some(
        r => (r.source === sourceId && r.target === targetId && r.type === relationType) ||
             (r.source === targetId && r.target === sourceId && r.type === relationType)
      );
      if (exists) return prev;
      return {
        ...prev,
        relations: [...prev.relations, { id: uuidv4(), source: sourceId, target: targetId, type: relationType }]
      };
    });
  };

  const deleteRelation = (relationId) => {
    setData(prev => ({
      ...prev,
      relations: prev.relations.filter(r => r.id !== relationId)
    }));
  };

  const removeRelationBetween = (memberAId, memberBId) => {
    setData(prev => ({
      ...prev,
      relations: prev.relations.filter(
        r => !( (r.source === memberAId && r.target === memberBId) ||
                (r.source === memberBId && r.target === memberAId) )
      )
    }));
  };

  return (
    <FamilyContext.Provider value={{ data, addMember, addParents, addRelation, deleteRelation, removeRelationBetween, updateMember, deleteMember, clearTree }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);
