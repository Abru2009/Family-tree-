import React, { useState } from 'react';
import { FamilyProvider, useFamily } from './FamilyContext';
import { AuthProvider, useAuth } from './AuthContext';
import FamilyGraph from './components/FamilyGraph';
import AddMemberModal from './components/AddMemberModal';
import BulkChildModal from './components/BulkChildModal';
import UpdateMemberModal from './components/UpdateMemberModal';
import BirthdayNotifier from './components/BirthdayNotifier';
import RelationshipModal from './components/RelationshipModal';
import RemoveConnectionModal from './components/RemoveConnectionModal';
import AuthModal from './components/AuthModal';
import PersonDetailPanel from './components/PersonDetailPanel';
import FamilyCalendar from './components/FamilyCalendar';
import HeritageFilter from './components/HeritageFilter';
import ExportModal from './components/ExportModal';

const AppContent = () => {
  const { data, heritageColors } = useFamily();
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  const [modalOpenFor, setModalOpenFor] = useState(null);
  const [bulkChildOpenFor, setBulkChildOpenFor] = useState(null);
  const [updateModalOpenFor, setUpdateModalOpenFor] = useState(null);
  const [removeConnectionFor, setRemoveConnectionFor] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const handleAddRelative = (id) => setModalOpenFor(id);
  const handleAddBulkChildren = (id) => setBulkChildOpenFor(id);
  const handleSelectMember = (id) => setSelectedMemberId(id);
  const handleUpdateMember = (id) => setUpdateModalOpenFor(id);
  const handleRemoveConnections = (id) => setRemoveConnectionFor(id);

  const handleCloseModal = () => {
    setModalOpenFor(null);
    setBulkChildOpenFor(null);
    setUpdateModalOpenFor(null);
    setRemoveConnectionFor(null);
    setShowRelationshipModal(false);
  };

  const selectedMember = data.members.find(m => m.id === selectedMemberId);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <BirthdayNotifier />
      <FamilyGraph 
        onAddRelative={handleAddRelative}
        onAddBulkChildren={handleAddBulkChildren}
        onSelectMember={handleSelectMember}
        onAddRoot={() => handleAddRelative('ROOT')} 
        onUpdateMember={handleUpdateMember}
        onRemoveConnections={handleRemoveConnections}
        onOpenRelationshipModal={() => setShowRelationshipModal(true)}
        onOpenCalendar={() => setShowCalendar(true)}
        onOpenFilter={() => setShowFilter(v => !v)}
        onOpenExport={() => setShowExport(true)}
        isRelationshipOpen={showRelationshipModal}
      />

      {isAuthModalOpen && (
        <AuthModal onClose={closeAuthModal} allowClose={true} />
      )}
      
      {modalOpenFor && (
        <AddMemberModal 
          relatedToId={modalOpenFor} 
          onClose={handleCloseModal} 
        />
      )}

      {bulkChildOpenFor && (
        <BulkChildModal
          parentId={bulkChildOpenFor}
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

      {showCalendar && (
        <FamilyCalendar
          onClose={() => setShowCalendar(false)}
          onSelectMember={handleSelectMember}
        />
      )}

      {showFilter && (
        <HeritageFilter onClose={() => setShowFilter(false)} />
      )}

      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} />
      )}

      {selectedMember && (
        <PersonDetailPanel
          member={selectedMember}
          data={data}
          heritageColors={heritageColors}
          onClose={() => setSelectedMemberId(null)}
          onEdit={() => {
            setUpdateModalOpenFor(selectedMember.id);
            setSelectedMemberId(null);
          }}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <AppContent />
      </FamilyProvider>
    </AuthProvider>
  );
}

export default App;
