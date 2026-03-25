'use client'
import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Ticket, Scan, Home, Wallet, CheckCircle, XCircle, Loader2, LogOut, Info } from 'lucide-react'

export default function GoalTixApp() {
  const [view, setView] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [userTickets, setUserTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [txId, setTxId] = useState('')
  const [network, setNetwork] = useState('Airtel')
  const [scanResult, setScanResult] = useState<any>(null)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchTickets(data.user.id)
    })
    fetchEvents()
  }, [])

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*, ticket_types(*)').eq('status', 'published')
    setEvents(data || [])
  }

  async function fetchTickets(uid: string) {
    const { data } = await supabase.from('tickets').select('*, ticket_types(name), events(title, venue, match_date)').eq('user_id', uid)
    setUserTickets(data || [])
  }

  const handleLogin = async () => {
    const email = prompt("Enter your email for login:")
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert("Login link sent! Check your email inbox.")
  }

  const submitPayment = async () => {
    if (!user) return handleLogin()
    setLoading(true)
    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: selectedEvent.ticket_types[0].price,
      provider: 'mobile_money',
      provider_ref: txId,
      transaction_id: txId,
      network: network,
      status: 'pending',
      ticket_type_id: selectedEvent.ticket_types[0].id,
      quantity: 1
    })
    if (error) alert(error.message)
    else {
      alert("Verification pending. Your ticket will appear in 'Tickets' once confirmed.")
      setView('my-tickets')
    }
    setLoading(false)
  }

  const startScanner = () => {
    setView('scanner')
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false)
      scanner.render(async (text) => {
        scanner.clear()
        const { data } = await supabase.rpc('validate_and_scan_ticket', {
          p_qr_token: text,
          p_device_id: 'GATE_01',
          p_gate_name: 'Main Gate'
        })
        setScanResult(data)
      }, () => {})
    }, 500)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 shadow-2xl relative">
      <header className="bg-blue-600 p-6 text-white rounded-b-[2.5rem] shadow-xl sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter italic leading-none">GOALTIX</h1>
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Malawi Match-Day</p>
        </div>
        {user ? <button onClick={() => supabase.auth.signOut()}><LogOut size={20}/></button> : <button onClick={handleLogin} className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Login</button>}
      </header>

      <main className="p-4">
        {view === 'home' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Info size={18}/> Active Matches</h2>
            {events.map(ev => (
              <div key={ev.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xl font-bold">{ev.title}</h3>
                <p className="text-slate-400 text-sm mb-4">{ev.venue} • {ev.match_date}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black text-blue-600 tracking-tighter">MK {ev.ticket_types[0]?.price}</span>
                  <button onClick={() => { setSelectedEvent(ev); setView('pay'); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition">Get Ticket</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'pay' && selectedEvent && (
          <div className="animate-in zoom-in-95">
            <button onClick={() => setView('home')} className="mb-4 text-slate-400 font-bold text-sm">← CANCEL</button>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border">
              <h2 className="text-center font-black text-xl mb-6">Payment Method</h2>
              <div className="flex gap-2 mb-6">
                <button onClick={() => setNetwork('Airtel')} className={`flex-1 p-4 rounded-2xl border-2 transition ${network==='Airtel'?'border-red-500 bg-red-50':'border-slate-50'}`}><span className="font-bold text-red-600">Airtel</span></button>
                <button onClick={() => setNetwork('TNM')} className={`flex-1 p-4 rounded-2xl border-2 transition ${network==='TNM'?'border-green-600 bg-green-50':'border-slate-50'}`}><span className="font-bold text-green-600">Mpamba</span></button>
              </div>
              <div className="bg-slate-900 text-white p-5 rounded-3xl mb-6 text-center">
                <p className="text-[10px] uppercase opacity-50 mb-1 font-bold">Pay MK {selectedEvent.ticket_types[0].price} to:</p>
                <p className="text-2xl font-mono font-bold">0881 234 567</p>
                <p className="text-[10px] mt-2 italic text-blue-400">Recipient: SPORTS ADMIN</p>
              </div>
              <input value={txId} onChange={e => setTxId(e.target.value)} placeholder="Transaction ID (from SMS)" className="w-full p-4 bg-slate-50 rounded-2xl mb-6 text-center font-mono font-bold border-2 border-transparent focus:border-blue-500 outline-none" />
              <button disabled={!txId || loading} onClick={submitPayment} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl disabled:opacity-30">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "I HAVE PAID"}
              </button>
            </div>
          </div>
        )}

        {view === 'my-tickets' && (
          <div className="space-y-6 pt-2">
            <h2 className="text-2xl font-black">My Tickets</h2>
            {userTickets.map(t => (
              <div key={t.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-md border border-slate-100">
                <div className="bg-blue-700 p-4 text-white text-center">
                  <h3 className="font-bold">{t.events.title}</h3>
                </div>
                <div className="p-8 flex justify-center bg-white border-b-2 border-dashed border-slate-100 relative">
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-full"></div>
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-full"></div>
                  {t.status === 'valid' ? <QRCodeSVG value={t.qr_token} size={200} /> : <div className="py-12 text-red-500 font-black"><XCircle size={64} className="mx-auto mb-2"/> USED</div>}
                </div>
                <div className="p-4 text-center">
                   <p className="text-[8px] font-mono text-slate-300 mb-2">{t.qr_token}</p>
                   <div className={`px-4 py-1 rounded-full text-[10px] font-bold inline-block ${t.status==='valid'?'bg-green-100 text-green-600':'bg-red-100 text-red-600'}`}>
                    {t.status.toUpperCase()}
                   </div>
                </div>
              </div>
            ))}
            {userTickets.length === 0 && <p className="text-center py-20 text-slate-400">No tickets found.</p>}
          </div>
        )}

        {view === 'scanner' && (
          <div className="flex flex-col items-center">
            <div id="reader" className="w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white"></div>
            {scanResult && (
              <div className={`mt-8 p-10 rounded-[3rem] text-center w-full shadow-2xl animate-in zoom-in-75 ${scanResult.success ? 'bg-green-500 text-white':'bg-red-500 text-white'}`}>
                {scanResult.success ? <CheckCircle size={80} className="mx-auto mb-4"/> : <XCircle size={80} className="mx-auto mb-4"/>}
                <p className="text-3xl font-black">{scanResult.success ? 'GRANTED' : 'DENIED'}</p>
                <p className="opacity-80 mt-1">{scanResult.message}</p>
                <button onClick={() => setScanResult(null)} className="mt-8 bg-white text-slate-900 px-10 py-4 rounded-2xl font-black">SCAN NEXT</button>
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-5 flex justify-around items-center z-50 max-w-md mx-auto">
        <button onClick={() => setView('home')} className={view==='home'?'text-blue-600':'text-slate-300'}><Home size={24}/></button>
        <button onClick={() => setView('my-tickets')} className={view==='my-tickets'?'text-blue-600':'text-slate-300'}><Wallet size={24}/></button>
        <button onClick={startScanner} className={view==='scanner'?'text-blue-600':'text-slate-300'}><Scan size={24}/></button>
      </nav>
    </div>
  )
}
