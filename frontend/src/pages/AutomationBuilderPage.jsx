import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Zap, ArrowLeft, Save, Play, Plus, Trash2, ChevronDown,
  GitBranch, Mail, Bell, UserPlus, ClipboardList, Edit,
  ArrowRightCircle, Tag, Globe, Filter, X, GripVertical,
  Check, AlertTriangle
} from 'lucide-react';
import * as automationService from '../services/automationService';
import { useAuth } from '../context/AuthContext';

/* =====================================================
   ICON MAP for action types
===================================================== */
const ACTION_ICONS = {
  send_email: Mail,
  send_notification: Bell,
  assign_user: UserPlus,
  create_task: ClipboardList,
  update_field: Edit,
  change_stage: ArrowRightCircle,
  add_tag: Tag,
  trigger_webhook: Globe,
};

/* =====================================================
   NODE COMPONENT (condition or action)
===================================================== */
const WorkflowNode = memo(({ node, index, metadata, onUpdate, onRemove, totalNodes }) => {
  const isCondition = node.type === 'condition';
  const Icon = isCondition ? Filter : (ACTION_ICONS[node.config?.action] || Zap);
  const borderColor = isCondition ? 'border-blue-300 bg-blue-50' : 'border-amber-300 bg-amber-50';
  const headerBg = isCondition ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800';

  return (
    <div className={`rounded-xl border-2 ${borderColor} overflow-hidden transition-all`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 ${headerBg}`}>
        <GripVertical className="w-4 h-4 opacity-40 cursor-move" />
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold flex-1">
          {isCondition ? `Condition ${index + 1}` : `Action ${index + 1}`}
        </span>
        <select
          value={node.type}
          onChange={e => onUpdate(node.id, { ...node, type: e.target.value, config: {} })}
          className="text-xs bg-white/60 border border-white/40 rounded px-2 py-0.5"
        >
          <option value="condition">Condition</option>
          <option value="action">Action</option>
        </select>
        <button onClick={() => onRemove(node.id)} className="p-1 hover:bg-white/40 rounded">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {isCondition ? (
          <ConditionConfig node={node} metadata={metadata} onUpdate={onUpdate} />
        ) : (
          <ActionConfig node={node} metadata={metadata} onUpdate={onUpdate} />
        )}

        {/* Branch labels */}
        {isCondition && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-blue-200">
            <GitBranch className="w-3 h-3" />
            <span className="text-green-600 font-medium">True → next node</span>
            <span className="mx-1">|</span>
            <span className="text-red-500 font-medium">False → skip / else branch</span>
          </div>
        )}
      </div>
    </div>
  );
});
WorkflowNode.displayName = 'WorkflowNode';

/* =====================================================
   CONDITION CONFIG
===================================================== */
const ConditionConfig = memo(({ node, metadata, onUpdate }) => {
  const fields = metadata?.conditionFields || [];
  const operators = metadata?.operators || [];

  const updateConfig = (key, value) => {
    onUpdate(node.id, { ...node, config: { ...node.config, [key]: value } });
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={node.config?.field || ''}
        onChange={e => updateConfig('field', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
      >
        <option value="">Select field...</option>
        {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <select
        value={node.config?.operator || ''}
        onChange={e => updateConfig('operator', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
      >
        <option value="">Operator...</option>
        {operators.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {/* Value — show select if the selected field has options */}
      {(() => {
        const fieldDef = fields.find(f => f.id === node.config?.field);
        if (fieldDef?.options) {
          return (
            <select
              value={node.config?.value || ''}
              onChange={e => updateConfig('value', e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            >
              <option value="">Value...</option>
              {fieldDef.options.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          );
        }
        return (
          <input
            type={fieldDef?.type === 'number' ? 'number' : 'text'}
            placeholder="Value..."
            value={node.config?.value ?? ''}
            onChange={e => updateConfig('value', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
        );
      })()}
    </div>
  );
});
ConditionConfig.displayName = 'ConditionConfig';

/* =====================================================
   ACTION CONFIG
===================================================== */
const ActionConfig = memo(({ node, metadata, onUpdate }) => {
  const actions = metadata?.actions || [];
  const selectedAction = node.config?.action || '';

  const updateConfig = (key, value) => {
    onUpdate(node.id, { ...node, config: { ...node.config, [key]: value } });
  };

  return (
    <div className="space-y-3">
      <select
        value={selectedAction}
        onChange={e => updateConfig('action', e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
      >
        <option value="">Select action...</option>
        {actions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>

      {/* Dynamic fields per action type */}
      {selectedAction === 'send_email' && (
        <div className="space-y-2">
          <input placeholder="Subject (use {{name}} for variables)" value={node.config?.subject || ''} onChange={e => updateConfig('subject', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
          <textarea placeholder="Email body (HTML or plain text, use {{name}}, {{email}}, etc.)" rows={3} value={node.config?.body || ''} onChange={e => updateConfig('body', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none" />
          <input placeholder="To (optional — defaults to contact email)" value={node.config?.to || ''} onChange={e => updateConfig('to', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
        </div>
      )}

      {selectedAction === 'send_notification' && (
        <div className="space-y-2">
          <input placeholder="Title" value={node.config?.title || ''} onChange={e => updateConfig('title', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
          <textarea placeholder="Message (use {{name}}, {{status}}, etc.)" rows={2} value={node.config?.message || ''} onChange={e => updateConfig('message', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none" />
          <input type="number" placeholder="Target Employee ID (optional — defaults to assigned)" value={node.config?.empId || ''} onChange={e => updateConfig('empId', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
        </div>
      )}

      {selectedAction === 'assign_user' && (
        <input type="number" placeholder="Employee ID to assign" value={node.config?.empId || ''} onChange={e => updateConfig('empId', e.target.value ? parseInt(e.target.value) : '')}
          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
      )}

      {selectedAction === 'create_task' && (
        <div className="space-y-2">
          <input placeholder="Task title" value={node.config?.title || ''} onChange={e => updateConfig('title', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
          <input placeholder="Description (optional)" value={node.config?.description || ''} onChange={e => updateConfig('description', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
          <input type="number" placeholder="Due in hours (default: 24)" value={node.config?.dueInHours || ''} onChange={e => updateConfig('dueInHours', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
        </div>
      )}

      {selectedAction === 'update_field' && (
        <div className="grid grid-cols-2 gap-2">
          <select value={node.config?.field || ''} onChange={e => updateConfig('field', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30">
            <option value="">Field to update...</option>
            {(metadata?.conditionFields || []).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <input placeholder="New value" value={node.config?.value || ''} onChange={e => updateConfig('value', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
        </div>
      )}

      {selectedAction === 'change_stage' && (
        <select value={node.config?.stage || ''} onChange={e => updateConfig('stage', e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30">
          <option value="">Select stage...</option>
          {['LEAD','MQL','SQL','OPPORTUNITY','CUSTOMER','EVANGELIST','DORMANT'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {selectedAction === 'add_tag' && (
        <input placeholder="Tag / Label name" value={node.config?.tag || ''} onChange={e => updateConfig('tag', e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
      )}

      {selectedAction === 'trigger_webhook' && (
        <div className="space-y-2">
          <input placeholder="Webhook URL (https://...)" value={node.config?.url || ''} onChange={e => updateConfig('url', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
          <select value={node.config?.method || 'POST'} onChange={e => updateConfig('method', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30">
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
          </select>
        </div>
      )}
    </div>
  );
});
ActionConfig.displayName = 'ActionConfig';

/* =====================================================
   CONNECTOR LINE between nodes
===================================================== */
const Connector = ({ label }) => (
  <div className="flex flex-col items-center py-1">
    <div className="w-0.5 h-4 bg-gray-300" />
    {label && <span className="text-[10px] text-gray-400 font-medium">{label}</span>}
    <div className="w-0.5 h-4 bg-gray-300" />
    <ChevronDown className="w-4 h-4 text-gray-300 -mt-1" />
  </div>
);

/* =====================================================
   MAIN BUILDER PAGE
===================================================== */
const AutomationBuilderPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const basePath = isAdmin ? '/admin' : '';
  const isEdit = !!id;

  const [metadata, setMetadata] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [triggerConfig, setTriggerConfig] = useState({});
  const [nodes, setNodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate unique node ID
  const nextId = useRef(1);
  const genId = () => `node_${nextId.current++}`;

  // Load metadata + existing automation (if editing)
  useEffect(() => {
    const init = async () => {
      try {
        const meta = await automationService.getBuilderMetadata();
        setMetadata(meta);

        if (isEdit) {
          const res = await automationService.getAutomation(id);
          const a = res.automation;
          setName(a.name);
          setDescription(a.description || '');
          setTriggerType(a.trigger_type);
          setTriggerConfig(a.trigger_config || {});
          setNodes(a.workflow || []);
          // Sync nextId to avoid collisions
          const maxNum = (a.workflow || []).reduce((max, n) => {
            const m = parseInt(n.id?.replace('node_', ''), 10);
            return isNaN(m) ? max : Math.max(max, m);
          }, 0);
          nextId.current = maxNum + 1;
        }
      } catch (err) {
        setError('Failed to load. Please try again.');
      }
      setLoading(false);
    };
    init();
  }, [id, isEdit]);

  // Add a node
  const addNode = useCallback((type = 'action') => {
    const nodeId = genId();
    setNodes(prev => {
      const updated = [...prev, { id: nodeId, type, config: {}, next: null, nextElse: null }];
      // Auto-wire: set previous node's next to this node
      if (updated.length > 1) {
        updated[updated.length - 2].next = nodeId;
      }
      return updated;
    });
  }, []);

  // Update a node
  const updateNode = useCallback((nodeId, newNode) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...newNode, id: nodeId } : n));
  }, []);

  // Remove a node
  const removeNode = useCallback((nodeId) => {
    setNodes(prev => {
      const idx = prev.findIndex(n => n.id === nodeId);
      const updated = prev.filter(n => n.id !== nodeId);
      // Re-wire: connect previous node's next to the removed node's next
      if (idx > 0 && updated[idx - 1]) {
        updated[idx - 1].next = updated[idx]?.id || null;
      }
      return updated;
    });
  }, []);

  // Save
  const handleSave = useCallback(async (asDraft = false) => {
    if (!name.trim() || !triggerType) {
      setError('Name and trigger type are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
        trigger_config: Object.keys(triggerConfig).length > 0 ? triggerConfig : null,
        workflow: nodes,
        is_draft: asDraft,
        is_active: !asDraft,
      };
      if (isEdit) {
        await automationService.updateAutomation(id, payload);
      } else {
        await automationService.createAutomation(payload);
      }
      navigate(`${basePath}/automations`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save automation.');
    }
    setSaving(false);
  }, [name, description, triggerType, triggerConfig, nodes, isEdit, id, navigate, basePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const triggers = metadata?.triggers || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`${basePath}/automations`)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Automation' : 'New Automation'}</h1>
          <p className="text-sm text-gray-500">Define trigger, conditions and actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : (isEdit ? 'Update & Activate' : 'Save & Activate')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Name & Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <input
          type="text"
          placeholder="Automation name *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full text-lg font-semibold border-0 border-b border-gray-200 pb-2 focus:outline-none focus:border-amber-400 placeholder-gray-300"
        />
        <input
          type="text"
          placeholder="Short description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full text-sm border-0 border-b border-gray-100 pb-2 focus:outline-none focus:border-amber-400 placeholder-gray-300"
        />
      </div>

      {/* Trigger */}
      <div className="bg-white rounded-xl border-2 border-purple-300 overflow-hidden">
        <div className="px-5 py-3 bg-purple-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-700" />
            <span className="text-sm font-semibold text-purple-800">Trigger</span>
          </div>
        </div>
        <div className="p-5">
          <select
            value={triggerType}
            onChange={e => { setTriggerType(e.target.value); setTriggerConfig({}); }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
          >
            <option value="">Select a trigger event...</option>
            {triggers.map(t => (
              <option key={t.id} value={t.id}>{t.label} ({t.category})</option>
            ))}
          </select>

          {/* Trigger filter config — e.g. only for specific status */}
          {triggerType && (triggerType.includes('status') || triggerType.includes('stage')) && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg">
              <label className="text-xs font-medium text-purple-700">Filter: Only trigger when status equals</label>
              <select
                value={triggerConfig.status || ''}
                onChange={e => setTriggerConfig(prev => ({ ...prev, status: e.target.value || undefined }))}
                className="w-full mt-1 text-sm border border-purple-200 rounded-lg px-2.5 py-2 focus:outline-none"
              >
                <option value="">Any status (no filter)</option>
                {['LEAD','MQL','SQL','OPPORTUNITY','CUSTOMER','EVANGELIST','DORMANT'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Workflow nodes */}
      {triggerType && (
        <>
          <Connector label="when triggered" />

          {nodes.map((node, idx) => (
            <div key={node.id}>
              <WorkflowNode
                node={node}
                index={idx}
                metadata={metadata}
                onUpdate={updateNode}
                onRemove={removeNode}
                totalNodes={nodes.length}
              />
              {idx < nodes.length - 1 && <Connector />}
            </div>
          ))}

          {/* Add node buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => addNode('condition')}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              Add Condition
            </button>
            <button
              onClick={() => addNode('action')}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-amber-300 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Action
            </button>
          </div>

          {/* Workflow summary */}
          {nodes.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Workflow Summary</h4>
              <div className="flex flex-wrap gap-2">
                {nodes.map((n, i) => (
                  <span key={n.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    n.type === 'condition' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {n.type === 'condition' ? '?' : '⚡'}
                    {n.type === 'condition' ? (n.config?.field || 'Condition') : (n.config?.action || 'Action')}
                    {i < nodes.length - 1 && <ArrowRightCircle className="w-3 h-3 ml-1 opacity-40" />}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AutomationBuilderPage;
