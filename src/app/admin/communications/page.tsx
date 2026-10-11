'use client';

import { useState, useEffect } from 'react';
import { prepareManualNotification, sendSingleNotification, getActiveBatches, getBatchClasses } from '@/actions/communications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function CommunicationsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [audienceDialogOpen, setAudienceDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);

  const [manualNumbers, setManualNumbers] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [preparedData, setPreparedData] = useState<any>(null);
  const [sendProgress, setSendProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [recipientStatuses, setRecipientStatuses] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  
  const [newManualName, setNewManualName] = useState('');
  const [newManualPhone, setNewManualPhone] = useState('');

  useEffect(() => {
    getActiveBatches().then(res => setBatches(res)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      getBatchClasses(selectedBatch).then(res => setClasses(res)).catch(console.error);
    } else {
      setClasses([]);
    }
  }, [selectedBatch]);

  async function executeSend(audience: string) {
    if (!pendingAction) return;
    setLoading(true);
    setMessage('');
    setAudienceDialogOpen(false);
    
    try {
      const payload = { 
        ...pendingAction.data, 
        audience,
        manualNumbers,
        selectedBatchIds
      };
      const res = await prepareManualNotification(payload);
      setPreparedData(res);
      const initialStatuses: any = {};
      res.recipients.forEach((r: any) => initialStatuses[r.phone] = 'pending');
      setRecipientStatuses(initialStatuses);
      setSendProgress(0);
      setPreviewModalOpen(true);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    
    setLoading(false);
  }

  async function startSending() {
    if (!preparedData) return;
    setIsSending(true);
    let sentCount = 0;
    
    for (const recipient of preparedData.recipients) {
      try {
        await sendSingleNotification(recipient.phone, preparedData.templateName, preparedData.templateParams);
        setRecipientStatuses(prev => ({ ...prev, [recipient.phone]: 'success' }));
      } catch (e) {
        setRecipientStatuses(prev => ({ ...prev, [recipient.phone]: 'error' }));
      }
      sentCount++;
      setSendProgress(Math.round((sentCount / preparedData.recipients.length) * 100));
    }
    
    setIsSending(false);
    setMessage('Sending complete!');
    setPendingAction(null);
  }

  function addManualRecipient() {
    if (!newManualName || !newManualPhone) return;
    const newRecipient = { name: newManualName, phone: newManualPhone, role: 'Manual' };
    setPreparedData((prev: any) => ({
      ...prev,
      recipients: [newRecipient, ...prev.recipients]
    }));
    setRecipientStatuses(prev => ({ ...prev, [newManualPhone]: 'pending' }));
    setNewManualName('');
    setNewManualPhone('');
  }

  function requestSend(type: string, data: any) {
    setPendingAction({ type, data: { type, ...data } });
    setAudienceDialogOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manual Communications</h1>
      <p className="text-gray-400">Trigger WhatsApp notifications manually for testing or ad-hoc events.</p>

      {message && (
        <div className="p-4 bg-blue-900/50 text-blue-200 border border-blue-800 rounded">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class Reminder */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Class Reminder / Cancellation</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            requestSend(fd.get('actionType') as string, {
              classInstanceId: selectedClass,
            });
          }} className="space-y-4">
            <div>
              <Label>Select Batch</Label>
              <select 
                className="w-full bg-slate-800 border-slate-700 rounded p-2 text-sm mt-1" 
                value={selectedBatch} 
                onChange={(e) => { setSelectedBatch(e.target.value); setSelectedClass(''); }}
                required
              >
                <option value="">-- Choose Batch --</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            {selectedBatch && (
              <div>
                <Label>Select Class Instance</Label>
                <select 
                  className="w-full bg-slate-800 border-slate-700 rounded p-2 text-sm mt-1" 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {format(new Date(c.date), 'dd MMM yyyy')} - {c.startTime} to {c.endTime} [{c.status}]
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <Label>Action</Label>
              <select name="actionType" className="w-full bg-slate-800 border-slate-700 rounded p-2 text-sm mt-1" required>
                <option value="CLASS_REMINDER">Send Reminder</option>
                <option value="CLASS_CANCELLED">Send Cancellation</option>
              </select>
            </div>
            <Button type="submit" disabled={loading || !selectedClass}>Send Class Notification</Button>
          </form>
        </Card>

        {/* Holiday */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Holiday Announcement</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            requestSend('HOLIDAY', {
              holidayName: fd.get('holidayName'),
              startDate: fd.get('startDate'),
              endDate: fd.get('endDate'),
            });
          }} className="space-y-4">
            <div>
              <Label>Holiday Name</Label>
              <Input name="holidayName" required placeholder="e.g. Diwali Break" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Date</Label>
                <Input type="date" name="startDate" required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" name="endDate" required />
              </div>
            </div>
            <Button type="submit" disabled={loading}>Create & Notify Holiday</Button>
          </form>
        </Card>

        {/* Tournament */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Tournament Announcement</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            requestSend('TOURNAMENT', {
              tournamentName: fd.get('tournamentName'),
              date: fd.get('date'),
              time: fd.get('time'),
              tournamentType: fd.get('tournamentType'),
              registrationLink: fd.get('registrationLink'),
            });
          }} className="space-y-4">
            <div>
              <Label>Tournament Name</Label>
              <Input name="tournamentName" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input type="date" name="date" required />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" name="time" required />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Input name="tournamentType" required placeholder="e.g. Rapid / Blitz" />
            </div>
            <div>
              <Label>Registration Link</Label>
              <Input name="registrationLink" required type="url" />
            </div>
            <Button type="submit" disabled={loading}>Create & Notify Tournament</Button>
          </form>
        </Card>
      </div>

      {/* Audience Selection Dialog */}
      <Dialog 
        open={audienceDialogOpen} 
        onClose={() => setAudienceDialogOpen(false)}
        title="Select Audience"
        description="Who should receive this notification?"
      >
        <div className="flex flex-col gap-3 py-4">
          <Button variant="secondary" className="justify-start border-slate-700 hover:bg-slate-800" onClick={() => executeSend('BATCH_ONLY')}>
            Batch Students & Coach Only (Class Notifications)
          </Button>
          <Button variant="secondary" className="justify-start border-slate-700 hover:bg-slate-800" onClick={() => executeSend('ALL_STUDENTS')}>
            All Students
          </Button>
          <Button variant="secondary" className="justify-start border-slate-700 hover:bg-slate-800" onClick={() => executeSend('ALL_COACHES')}>
            All Coaches
          </Button>
          <Button variant="secondary" className="justify-start border-slate-700 hover:bg-slate-800" onClick={() => executeSend('EVERYONE')}>
            Everyone (All Students & Coaches)
          </Button>
          
          <hr className="border-slate-700 my-2" />
          
          <div className="space-y-2">
            <Label>Specific Batches</Label>
            <select 
              multiple
              className="w-full bg-slate-800 border-slate-700 rounded p-2 text-sm"
              value={selectedBatchIds}
              onChange={e => setSelectedBatchIds(Array.from(e.target.selectedOptions, option => option.value))}
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <Button variant="secondary" className="w-full justify-start border-slate-700 hover:bg-slate-800" onClick={() => executeSend('SPECIFIC_BATCHES')} disabled={selectedBatchIds.length === 0}>
              Send to Selected Batches
            </Button>
          </div>

          <hr className="border-slate-700 my-2" />

          <div className="space-y-2">
            <Label>Manual Phone Numbers (comma separated)</Label>
            <Input 
              placeholder="e.g. 919876543210, 918765432109" 
              value={manualNumbers}
              onChange={e => setManualNumbers(e.target.value)}
            />
            <Button variant="secondary" className="w-full justify-start border-slate-700 hover:bg-slate-800" onClick={() => executeSend('MANUAL_NUMBERS')} disabled={!manualNumbers}>
              Send to Manual Numbers
            </Button>
          </div>
        </div>
        <div className="flex justify-start mt-4">
          <Button type="button" variant="ghost" onClick={() => setAudienceDialogOpen(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>

      {/* Preview and Send Dialog */}
      <Dialog 
        open={previewModalOpen} 
        onClose={() => !isSending && setPreviewModalOpen(false)}
        title="Preview & Send Notification"
        description="Verify the template and recipient list before sending."
      >
        <div className="py-4 space-y-4">
          <div>
            <Label className="text-gray-400">Template Preview</Label>
            <div className="bg-slate-900 p-3 rounded mt-1 text-sm whitespace-pre-wrap font-mono text-gray-300">
              {preparedData?.templatePreview}
            </div>
          </div>
          
          <div className="border border-slate-700 rounded p-3 space-y-2">
            <Label>Add Recipient</Label>
            <div className="flex gap-2">
              <Input placeholder="Name" value={newManualName} onChange={e => setNewManualName(e.target.value)} disabled={isSending} className="flex-1" />
              <Input placeholder="Phone" value={newManualPhone} onChange={e => setNewManualPhone(e.target.value)} disabled={isSending} className="flex-1" />
              <Button onClick={addManualRecipient} disabled={isSending} variant="secondary">Add</Button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label>Recipients ({preparedData?.recipients.length || 0})</Label>
              {isSending && <span className="text-xs text-blue-400">{sendProgress}% Complete</span>}
            </div>
            
            {(isSending || sendProgress > 0) && (
              <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${sendProgress}%` }}></div>
              </div>
            )}

            <div className="bg-slate-800 rounded max-h-60 overflow-y-auto p-2 space-y-1">
              {preparedData?.recipients.map((r: any, idx: number) => (
                <div key={`${r.phone}-${idx}`} className="flex justify-between items-center bg-slate-900 p-2 rounded text-sm">
                  <div>
                    <span className="font-medium text-slate-200">{r.name}</span> <span className="text-gray-400 text-xs">({r.role})</span>
                    <div className="text-xs text-gray-500">{r.phone}</div>
                  </div>
                  <div>
                    {recipientStatuses[r.phone] === 'success' && <span className="text-green-500 font-medium">✓ Sent</span>}
                    {recipientStatuses[r.phone] === 'error' && <span className="text-red-500 font-medium">❌ Failed</span>}
                    {recipientStatuses[r.phone] === 'pending' && <span className="text-gray-500">Pending</span>}
                  </div>
                </div>
              ))}
              {preparedData?.recipients.length === 0 && (
                <div className="text-gray-500 text-center py-2">No recipients found</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={() => setPreviewModalOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={startSending} disabled={isSending || !preparedData?.recipients.length} className="bg-blue-600 hover:bg-blue-700">
            {isSending ? 'Sending...' : 'Start Sending'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
