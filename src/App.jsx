import React, { useState } from 'react';
import { FamilyProvider } from './FamilyContext';
import FamilyGraph from './components/FamilyGraph';
import AddMemberModal from './components/AddMemberModal';
import UpdateMemberModal from './components/UpdateMemberModal';
import BirthdayNotifier from './components/BirthdayNotifier';
import RelationshipModal from './components/RelationshipModal';
import RemoveConnectionModal from './components/RemoveConnectionModal';

const AppContent = () => {
  const [modalOpenFor, setModalOpenFor] = useState(null);
  const [updateModalOpenFor, setUpdateModalOpenFor] = useState(null);
  const [removeConnectionFor, setRemoveConnectionFor] = useState(null);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);

  const handleAddRelative = (id) => {
    setModalOpenFor(id);
  };

  const handleUpdateMember = (id) => {
    setUpdateModalOpenFor(id);
  };

  const handleRemoveConnections = (id) => {
    setRemoveConnectionFor(id);
  };

  const handleCloseModal = () => {
    setModalOpenFor(null);
    setUpdateModalOpenFor(null);
    setRemoveConnectionFor(null);
    setShowRelationshipModal(false);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <BirthdayNotifier />
      <FamilyGraph 
        onAddRelative={handleAddRelative} 
        onAddRoot={() => handleAddRelative('ROOT')} 
        onUpdateMember={handleUpdateMember}
        onRemoveConnections={handleRemoveConnections}
        onOpenRelationshipModal={() => setShowRelationshipModal(true)}
        isRelationshipOpen={showRelationshipModal}
      />
      
      {modalOpenFor && (
        <AddMemberModal 
          relatedToId={modalOpenFor} 
          onClose={handleCloseModal} 
        />
      )}

      {updateModalOpenFor && (
        <UpdateMemberModal 
          memberId={updateModalOpenFor} 
          onClose={handleCloseModal} 
        />
      )}

      {removeConnectionFor && (
        <RemoveConnectionModal
          memberId={removeConnectionFor}
          onClose={handleCloseModal}
        />
      )}

      {showRelationshipModal && (
        <RelationshipModal onClose={handleCloseModal} />
      )}
    </div>
  );
};

function App() {
  return (
    <FamilyProvider>
      <AppContent />
    </FamilyProvider>
  );
}

export default App;
