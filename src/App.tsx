import { useState, useEffect } from "react";
import type { CSSProperties } from "react";

const EMAILJS_SERVICE_ID = "service_surimpt";
const EMAILJS_TEMPLATE_ID = "template_0c3vcel";
const EMAILJS_PUBLIC_KEY = "0QTpdeFpOeU3lNEDm";

const SUPABASE_URL = "https://fnhmcvvgxzqeudqmglmi.supabase.co";
const SUPABASE_KEY = "sb_publishable_PwZtviuYsI1RX8KxZ7AUbA_iGtHnogn";

const services = [
  { id: "basico", name: "Lavado Básico", price: 199, duration: "45 min", icon: "💧", desc: "Exterior completo + secado", color: "#00C9FF" },
  { id: "completo", name: "Lavado Completo", price: 349, duration: "90 min", icon: "✨", desc: "Exterior + interior + aspirado", color: "#A78BFA", popular: true },
  { id: "premium", name: "Detailing Premium", price: 699, duration: "3 hrs", icon: "🏆", desc: "Pulido + encerado + ozono", color: "#F59E0B" },
];

const ALL_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

const vehicleTypes = [
  { id: "sedan", label: "Sedán", icon: "🚗" },
  { id: "suv", label: "SUV / Pick-up", icon: "🚙" },
  { id: "moto", label: "Moto", icon: "🏍️" },
];

function getDaysFromToday(n: number) {
  const days = [];
  const names = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({ label: names[d.getDay()], day: d.getDate(), month: months[d.getMonth()], full: d.toISOString().split("T")[0] });
  }
  return days;
}

async function getReservedSlots(date: string): Promise<string[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reservas?fecha=eq.${date}&select=hora`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((r: { hora: string }) => r.hora.slice(0, 5));
}

async function saveReserva(data: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reservas`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Supabase error");
}

async function sendEmail(templateParams: Record<string, string>) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: templateParams }),
  });
  if (!res.ok) throw new Error("EmailJS error");
}

interface FormState {
  service: string | null;
  vehicle: string | null;
  date: string | null;
  time: string | null;
  name: string;
  phone: string;
  address: string;
  notes: string;
}

export default function App() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ service: null, vehicle: null, date: null, time: null, name: "", phone: "", address: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const days = getDaysFromToday(10);
  const update = (key: keyof FormState, val: string) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (form.date) {
      setLoadingSlots(true);
      setForm(f => ({ ...f, time: null }));
      getReservedSlots(form.date).then(slots => {
        setReservedSlots(slots);
        setLoadingSlots(false);
      });
    }
  }, [form.date]);

  const canNext = () => {
    if (step === 1) return form.service && form.vehicle;
    if (step === 2) return form.date && form.time;
    if (step === 3) return form.name.trim() && form.phone.trim() && form.address.trim();
    return true;
  };

  const selectedService = services.find(s => s.id === form.service);
  const selectedVehicle = vehicleTypes.find(v => v.id === form.vehicle);

  const handleSubmit = async () => {
    setSending(true);
    setEmailError(false);
    try {
      await saveReserva({
        fecha: form.date!,
        hora: form.time! + ":00",
        servicio: selectedService?.name ?? "",
        vehiculo: selectedVehicle?.label ?? "",
        cliente_nombre: form.name,
        cliente_telefono: form.phone,
        cliente_direccion: form.address,
        notas: form.notes || "",
      });
      await sendEmail({
        cliente_nombre: form.name,
        cliente_telefono: form.phone,
        cliente_direccion: form.address,
        servicio: selectedService?.name ?? "",
        vehiculo: selectedVehicle?.label ?? "",
        fecha: form.date ?? "",
        hora: form.time ?? "",
        total: `$${selectedService?.price} MXN`,
        notas: form.notes || "Sin notas",
      });
      setSubmitted(true);
    } catch {
      setEmailError(true);
    } finally {
      setSending(false);
    }
  };

  const resetApp = () => {
    setSubmitted(false);
    setStep(1);
    setReservedSlots([]);
    setForm({ service: null, vehicle: null, date: null, time: null, name: "", phone: "", address: "", notes: "" });
  };

  const s = styles;

  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.successCard}>
          <div style={s.successIcon}>🎉</div>
          <h2 style={s.successTitle}>¡Reserva Confirmada!</h2>
          <p style={s.successSub}>Te esperamos en tu domicilio</p>
          <div style={s.confirmBox}>
            <div style={s.confirmRow}><span style={s.confirmLabel}>Servicio</span><span style={s.confirmVal}>{selectedService?.name}</span></div>
            <div style={s.confirmRow}><span style={s.confirmLabel}>Vehículo</span><span style={s.confirmVal}>{selectedVehicle?.label}</span></div>
            <div style={s.confirmRow}><span style={s.confirmLabel}>Fecha</span><span style={s.confirmVal}>{form.date}</span></div>
            <div style={s.confirmRow}><span style={s.confirmLabel}>Hora</span><span style={s.confirmVal}>{form.time}</span></div>
            <div style={s.confirmRow}><span style={s.confirmLabel}>Dirección</span><span style={s.confirmVal}>{form.address}</span></div>
            <div style={s.confirmRow}><span style={s.confirmLabel}>Total</span><span style={{...s.confirmVal, color:"#00C9FF", fontWeight:700}}>${selectedService?.price} MXN</span></div>
          </div>
          <p style={s.successNote}>📧 Reserva enviada a <b>rianorussi@gmail.com</b></p>
          <button style={s.resetBtn} onClick={resetApp}>Nueva Reserva</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoIcon}>🚿</span>
          <div>
            <div style={s.logoName}>WashToGo</div>
            <div style={s.logoSub}>Autolavado a Domicilio</div>
          </div>
        </div>
        <div style={s.badge}>⚡ Disponible hoy</div>
      </header>

      <div style={s.progressWrap}>
        {[1,2,3].map(n => (
          <div key={n} style={s.progressItem}>
            <div style={{...s.progressDot, background: step >= n ? "#00C9FF" : "#1e2a3a", border: step >= n ? "2px solid #00C9FF" : "2px solid #1e2a3a"}}>
              {step > n ? "✓" : n}
            </div>
            <span style={{...s.progressLabel, color: step >= n ? "#00C9FF" : "#4a5568"}}>
              {n===1?"Servicio":n===2?"Agenda":"Datos"}
            </span>
            {n < 3 && <div style={{...s.progressLine, background: step > n ? "#00C9FF" : "#1e2a3a"}} />}
          </div>
        ))}
      </div>

      <div style={s.content}>
        {step === 1 && (
          <div>
            <h2 style={s.sectionTitle}>Elige tu servicio</h2>
            <div style={s.serviceGrid}>
              {services.map(sv => (
                <div key={sv.id} onClick={() => update("service", sv.id)}
                  style={{...s.serviceCard, border: form.service===sv.id ? `2px solid ${sv.color}` : "2px solid #1e2a3a", boxShadow: form.service===sv.id ? `0 0 20px ${sv.color}40` : "none"}}>
                  {sv.popular && <div style={s.popularTag}>⭐ Más popular</div>}
                  <div style={{fontSize:36}}>{sv.icon}</div>
                  <div style={s.serviceName}>{sv.name}</div>
                  <div style={s.serviceDesc}>{sv.desc}</div>
                  <div style={s.serviceMeta}>
                    <span style={s.serviceDuration}>⏱ {sv.duration}</span>
                    <span style={{...s.servicePrice, color: sv.color}}>${sv.price}</span>
                  </div>
                </div>
              ))}
            </div>
            <h2 style={{...s.sectionTitle, marginTop:28}}>Tipo de vehículo</h2>
            <div style={s.vehicleRow}>
              {vehicleTypes.map(v => (
                <div key={v.id} onClick={() => update("vehicle", v.id)}
                  style={{...s.vehicleCard, border: form.vehicle===v.id ? "2px solid #00C9FF" : "2px solid #1e2a3a", background: form.vehicle===v.id ? "#0d2035" : "#0a1628"}}>
                  <div style={{fontSize:28}}>{v.icon}</div>
                  <div style={s.vehicleLabel}>{v.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={s.sectionTitle}>Selecciona fecha</h2>
            <div style={s.daysScroll}>
              {days.map(d => (
                <div key={d.full} onClick={() => update("date", d.full)}
                  style={{...s.dayCard, border: form.date===d.full ? "2px solid #00C9FF" : "2px solid #1e2a3a", background: form.date===d.full ? "#0d2035" : "#0a1628"}}>
                  <div style={s.dayName}>{d.label}</div>
                  <div style={{...s.dayNum, color: form.date===d.full ? "#00C9FF" : "#e2e8f0"}}>{d.day}</div>
                  <div style={s.dayMonth}>{d.month}</div>
                </div>
              ))}
            </div>
            <h2 style={{...s.sectionTitle, marginTop:28}}>
              Elige hora {loadingSlots && <span style={{fontSize:13, color:"#64748b", fontWeight:400}}>cargando...</span>}
            </h2>
            <div style={s.timeGrid}>
              {ALL_SLOTS.map(t => {
                const occupied = reservedSlots.includes(t);
                return (
                  <div key={t} onClick={() => !occupied && update("time", t)}
                    style={{...s.timeChip,
                      background: occupied ? "#0a0f1a" : form.time===t ? "#00C9FF" : "#0a1628",
                      color: occupied ? "#1e2a3a" : form.time===t ? "#030d1a" : "#94a3b8",
                      border: occupied ? "2px solid #0d1520" : form.time===t ? "2px solid #00C9FF" : "2px solid #1e2a3a",
                      fontWeight: form.time===t ? 700 : 400,
                      cursor: occupied ? "not-allowed" : "pointer",
                      textDecoration: occupied ? "line-through" : "none",
                    }}>
                    {t}
                    {occupied && <div style={{fontSize:9, color:"#1e3a2a", marginTop:2}}>Ocupado</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={s.sectionTitle}>Tus datos</h2>
            <div style={s.formGroup}>
              <label style={s.label}>👤 Nombre completo</label>
              <input style={s.input} placeholder="Ej. Juan García" value={form.name} onChange={e => update("name", e.target.value)} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>📱 Teléfono / WhatsApp</label>
              <input style={s.input} placeholder="55 1234 5678" value={form.phone} onChange={e => update("phone", e.target.value)} type="tel" />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>📍 Dirección completa</label>
              <input style={s.input} placeholder="Calle, número, colonia, ciudad" value={form.address} onChange={e => update("address", e.target.value)} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>📝 Notas adicionales (opcional)</label>
              <textarea style={s.textarea} placeholder="Color del auto, referencias, instrucciones especiales..." value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} />
            </div>
            <div style={s.summaryBox}>
              <div style={s.summaryTitle}>Resumen de tu reserva</div>
              <div style={s.summaryRow}><span>🔧 {selectedService?.name}</span><span style={{color:"#00C9FF"}}>${selectedService?.price} MXN</span></div>
              <div style={s.summaryRow}><span>{selectedVehicle?.icon} {selectedVehicle?.label}</span></div>
              <div style={s.summaryRow}><span>📅 {form.date} · {form.time}</span></div>
            </div>
            {emailError && <div style={s.errorBox}>⚠️ No se pudo confirmar la reserva. Intenta de nuevo.</div>}
          </div>
        )}

        <div style={s.navRow}>
          {step > 1 && <button style={s.backBtn} onClick={() => setStep(n => n - 1)} disabled={sending}>← Atrás</button>}
          {step < 3 ? (
            <button style={{...s.nextBtn, opacity: canNext() ? 1 : 0.4, cursor: canNext() ? "pointer" : "not-allowed"}} onClick={() => canNext() && setStep(n => n + 1)}>
              Continuar →
            </button>
          ) : (
            <button style={{...s.nextBtn, background:"linear-gradient(90deg,#00C9FF,#8B5CF6)", opacity: (canNext()&&!sending)?1:0.5, cursor:(canNext()&&!sending)?"pointer":"not-allowed"}} onClick={() => canNext() && !sending && handleSubmit()}>
              {sending ? "Enviando..." : "Confirmar Reserva ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight:"100vh", background:"#030d1a", fontFamily:"'Sora','Segoe UI',sans-serif", color:"#e2e8f0", paddingBottom:40 },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 20px 16px", borderBottom:"1px solid #0d2035" },
  logo: { display:"flex", alignItems:"center", gap:12 },
  logoIcon: { fontSize:32 },
  logoName: { fontSize:20, fontWeight:800, color:"#fff", letterSpacing:-0.5 },
  logoSub: { fontSize:12, color:"#4a90b8", marginTop:1 },
  badge: { background:"#0a2a10", color:"#4ade80", border:"1px solid #16a34a", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 },
  progressWrap: { display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 20px 8px" },
  progressItem: { display:"flex", alignItems:"center", gap:8 },
  progressDot: { width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff" },
  progressLabel: { fontSize:12, fontWeight:600 },
  progressLine: { width:40, height:2, margin:"0 8px" },
  content: { padding:"20px 20px 0" },
  sectionTitle: { fontSize:17, fontWeight:700, color:"#fff", marginBottom:14, marginTop:0 },
  serviceGrid: { display:"flex", flexDirection:"column", gap:12 },
  serviceCard: { background:"#0a1628", borderRadius:16, padding:"16px 18px", cursor:"pointer", position:"relative", overflow:"hidden" },
  popularTag: { position:"absolute", top:10, right:10, background:"#7c3aed", color:"#fff", borderRadius:12, padding:"2px 10px", fontSize:11, fontWeight:600 },
  serviceName: { fontSize:16, fontWeight:700, color:"#fff", marginTop:8, marginBottom:4 },
  serviceDesc: { fontSize:13, color:"#64748b", marginBottom:10 },
  serviceMeta: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  serviceDuration: { fontSize:12, color:"#4a5568" },
  servicePrice: { fontSize:20, fontWeight:800 },
  vehicleRow: { display:"flex", gap:10 },
  vehicleCard: { flex:1, borderRadius:14, padding:"14px 8px", textAlign:"center", cursor:"pointer" },
  vehicleLabel: { fontSize:12, color:"#94a3b8", marginTop:6, fontWeight:600 },
  daysScroll: { display:"flex", gap:10, overflowX:"auto", paddingBottom:8 },
  dayCard: { minWidth:58, borderRadius:14, padding:"10px 8px", textAlign:"center", cursor:"pointer", flexShrink:0 },
  dayName: { fontSize:11, color:"#64748b", fontWeight:600, marginBottom:4 },
  dayNum: { fontSize:20, fontWeight:800, lineHeight:1 },
  dayMonth: { fontSize:11, color:"#4a5568", marginTop:4 },
  timeGrid: { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 },
  timeChip: { borderRadius:12, padding:"12px 6px", textAlign:"center", fontSize:14, transition:"all 0.15s" },
  formGroup: { marginBottom:16 },
  label: { display:"block", fontSize:13, color:"#64748b", fontWeight:600, marginBottom:6 },
  input: { width:"100%", background:"#0a1628", border:"1.5px solid #1e2a3a", borderRadius:12, padding:"13px 14px", color:"#e2e8f0", fontSize:15, outline:"none", boxSizing:"border-box" },
  textarea: { width:"100%", background:"#0a1628", border:"1.5px solid #1e2a3a", borderRadius:12, padding:"13px 14px", color:"#e2e8f0", fontSize:14, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" },
  summaryBox: { background:"#0a1628", border:"1.5px solid #1e2a3a", borderRadius:16, padding:"16px 18px", marginBottom:16 },
  summaryTitle: { fontSize:13, color:"#64748b", fontWeight:700, marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 },
  summaryRow: { display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:14, color:"#94a3b8", marginBottom:6 },
  errorBox: { background:"#2a0a0a", border:"1.5px solid #ef4444", borderRadius:12, padding:"12px 14px", color:"#fca5a5", fontSize:13, marginBottom:12 },
  navRow: { display:"flex", gap:12, marginTop:24 },
  backBtn: { flex:1, background:"transparent", border:"1.5px solid #1e2a3a", color:"#64748b", borderRadius:14, padding:"14px", fontSize:15, fontWeight:600, cursor:"pointer" },
  nextBtn: { flex:2, background:"#00C9FF", color:"#030d1a", borderRadius:14, padding:"14px", fontSize:16, fontWeight:800, border:"none", cursor:"pointer" },
  successCard: { maxWidth:420, margin:"60px auto 0", background:"#0a1628", border:"2px solid #00C9FF", borderRadius:24, padding:"36px 28px", textAlign:"center", boxShadow:"0 0 40px #00C9FF30" },
  successIcon: { fontSize:56, marginBottom:8 },
  successTitle: { fontSize:26, fontWeight:800, color:"#fff", margin:"0 0 6px" },
  successSub: { fontSize:15, color:"#64748b", marginBottom:24 },
  confirmBox: { background:"#030d1a", borderRadius:14, padding:"16px", marginBottom:20, textAlign:"left" },
  confirmRow: { display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #0d2035", fontSize:14 },
  confirmLabel: { color:"#4a5568", fontWeight:600 },
  confirmVal: { color:"#94a3b8" },
  successNote: { fontSize:13, color:"#64748b", marginBottom:24 },
  resetBtn: { background:"transparent", border:"1.5px solid #00C9FF", color:"#00C9FF", borderRadius:12, padding:"12px 28px", fontSize:14, fontWeight:700, cursor:"pointer" },
};
