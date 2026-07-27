import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PersonCard } from './PersonNode';

/**
 * CoupleNode – renders HUSBAND + WIFE as a single draggable React Flow node.
 * Neither spouse can be moved individually; the whole block moves together.
 */
const handleStyle = {
  width: 8,
  height: 8,
  background: '#45b7ae',
  border: '2px solid #ffffff',
  boxShadow: '0 0 4px rgba(69, 183, 174, 0.3)',
  borderRadius: '50%',
  zIndex: 10,
  cursor: 'crosshair',
};

const CoupleNode = ({ data }) => {
  const { husband, wife, onAddRelative, onUpdateMember, onRemoveConnections, onDelete } = data;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
      {/* Husband top handle */}
      <Handle
        type="target" position={Position.Top} id="top-husband"
        style={{ ...handleStyle, left: 110, top: -4 }}
      />
      {/* Wife top handle */}
      <Handle
        type="target" position={Position.Top} id="top-wife"
        style={{ ...handleStyle, left: 370, top: -4 }}
      />
      {/* Couple bottom handle */}
      <Handle
        type="source" position={Position.Bottom} id="bottom"
        style={{ ...handleStyle, left: 240, bottom: -4 }}
      />

      {/* Husband card */}
      <PersonCard
        member={{ ...husband, generation: husband.generation ?? data.generation }}
        onAddRelative={onAddRelative}
        onUpdateMember={onUpdateMember}
        onRemoveConnections={onRemoveConnections}
        onDelete={onDelete}
      />

      {/* Golden connector bar */}
      <div style={{
        width: 40,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Horizontal gold line */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: 2.5,
          background: 'linear-gradient(90deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%)',
          borderRadius: 2,
        }} />
      </div>

      {/* Wife card */}
      <PersonCard
        member={{ ...wife, generation: wife.generation ?? data.generation }}
        onAddRelative={onAddRelative}
        onUpdateMember={onUpdateMember}
        onRemoveConnections={onRemoveConnections}
        onDelete={onDelete}
      />
    </div>
  );
};

export default CoupleNode;

// Width constants for layout use
export const COUPLE_NODE_W = 220 * 2 + 40; // 480px
export const PERSON_NODE_W = 220;
export const NODE_H        = 140;
