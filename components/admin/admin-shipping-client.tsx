'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Rate {
  id: string;
  region: string;
  deliveryType: string;
  priceEurCents: number | null;
  priceGbpCents: number | null;
  expressAvailable: boolean;
  labelEn: string;
}

interface Pickup {
  id: string;
  region: string;
  nameEn: string;
  addressLine1: string;
  city: string;
  countryCode: string;
  postalCode: string;
  isActive: boolean;
}

export function AdminShippingClient() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickupForm, setPickupForm] = useState({
    region: 'EU',
    countryCode: 'NL',
    name: '',
    addressLine1: '',
    city: '',
    postalCode: '',
  });

  async function load() {
    const res = await fetch('/api/admin/shipping');
    const data = await res.json();
    setRates(data.rates ?? []);
    setPickups(data.pickups ?? []);
  }

  useEffect(() => { load(); }, []);

  async function saveRates() {
    setSaving(true);
    await fetch('/api/admin/shipping', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rates }),
    });
    setSaving(false);
  }

  async function addPickup(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/admin/shipping/pickups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pickupForm),
    });
    setPickupForm({ region: 'EU', countryCode: 'NL', name: '', addressLine1: '', city: '', postalCode: '' });
    load();
  }

  async function togglePickup(id: string, isActive: boolean) {
    await fetch(`/api/admin/shipping/pickups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    load();
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold">Shipping & pickup</h1>

      <h2 className="mt-8 font-semibold">Flat rates</h2>
      <div className="mt-4 space-y-4">
        {rates.map((rate, i) => (
          <div key={rate.id} className="grid gap-3 sm:grid-cols-4 border rounded-lg p-3">
            <div className="text-sm font-medium">{rate.region} · {rate.deliveryType}</div>
            <div><Label>EUR cents</Label><Input type="number" value={rate.priceEurCents ?? 0} onChange={(e) => setRates(rates.map((r, idx) => idx === i ? { ...r, priceEurCents: Number(e.target.value) } : r))} /></div>
            <div><Label>GBP cents</Label><Input type="number" value={rate.priceGbpCents ?? 0} onChange={(e) => setRates(rates.map((r, idx) => idx === i ? { ...r, priceGbpCents: Number(e.target.value) } : r))} /></div>
            {rate.deliveryType === 'EXPRESS' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rate.expressAvailable} onChange={(e) => setRates(rates.map((r, idx) => idx === i ? { ...r, expressAvailable: e.target.checked } : r))} />
                Express available
              </label>
            )}
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={saveRates} disabled={saving}>{saving ? 'Saving…' : 'Save rates'}</Button>

      <h2 className="mt-10 font-semibold">Pickup locations</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {pickups.map((p) => (
          <li key={p.id} className="border rounded-md p-3 flex justify-between items-center">
            <span>
              <span className="font-medium">{p.nameEn}</span> — {p.addressLine1}, {p.city} ({p.region})
              {!p.isActive && <span className="ms-2 text-destructive text-xs">Inactive</span>}
            </span>
            <Button size="sm" variant="outline" onClick={() => togglePickup(p.id, !p.isActive)}>
              {p.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={addPickup} className="mt-6 border rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-sm">Add pickup location</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Region</Label>
            <select className="w-full h-11 rounded-md border px-3" value={pickupForm.region} onChange={(e) => setPickupForm({ ...pickupForm, region: e.target.value })}>
              <option value="EU">EU</option>
              <option value="UK">UK</option>
            </select>
          </div>
          <div><Label>Country code</Label><Input value={pickupForm.countryCode} onChange={(e) => setPickupForm({ ...pickupForm, countryCode: e.target.value.toUpperCase() })} maxLength={2} required /></div>
          <div><Label>Name</Label><Input value={pickupForm.name} onChange={(e) => setPickupForm({ ...pickupForm, name: e.target.value })} required /></div>
          <div><Label>City</Label><Input value={pickupForm.city} onChange={(e) => setPickupForm({ ...pickupForm, city: e.target.value })} required /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={pickupForm.addressLine1} onChange={(e) => setPickupForm({ ...pickupForm, addressLine1: e.target.value })} required /></div>
          <div><Label>Postal code</Label><Input value={pickupForm.postalCode} onChange={(e) => setPickupForm({ ...pickupForm, postalCode: e.target.value })} required /></div>
        </div>
        <Button type="submit" size="sm">Add location</Button>
      </form>
    </div>
  );
}
