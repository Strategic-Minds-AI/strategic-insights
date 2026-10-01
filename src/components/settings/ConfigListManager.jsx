import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export default function ConfigListManager({ title, items, onAdd, onUpdate, onDelete, isLoading }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleSaveEdit = async () => {
    if (editValue.trim()) {
      await onUpdate(editingId, { name: editValue.trim() });
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleAdd = async () => {
    if (newValue.trim()) {
      await onAdd({ name: newValue.trim(), order: items.length });
      setNewValue('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50">
              {editingId === item.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1">{item.name}</span>
                  <Button size="icon" variant="ghost" onClick={() => handleStartEdit(item)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => onDelete(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No items yet</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={`Add new ${title.toLowerCase().slice(0, -1)}`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={!newValue.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}