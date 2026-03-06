import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Zap, 
  History, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  User,
  Calendar,
  Trash2,
  Clock
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { analyzeMeterImage } from './services/gemini';
import { cn } from './lib/utils';

// Types
interface MeterReading {
  id?: number;
  customer_name: string;
  customer_id: string;
  pea_meter_id: string;
  code111: number;
  code010: number;
  code020: number;
  code030: number;
  code015_handwritten: number;
  code015_printed: number;
  code050: number;
  code016_handwritten: number;
  code016_printed: number;
  code060: number;
  code017_handwritten: number;
  code017_printed: number;
  code070: number;
  code118_handwritten: number;
  code118_printed: number;
  code280: number;
  reading_date: string;
  image_url?: string;
}

interface HistoryItem {
  id: number;
  customer_name: string;
  customer_id: string;
  pea_meter_id: string;
  reading_date: string;
  data: MeterReading;
}

export default function App() {
  const [view, setView] = useState<'home' | 'reader' | 'history' | 'detail'>('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentReading, setCurrentReading] = useState<MeterReading | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedReading, setSelectedReading] = useState<HistoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/readings');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsAnalyzing(true);
    try {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];
        const result = await analyzeMeterImage(base64Image);
        
        if (result) {
          setCurrentReading({
            customer_name: result.customer_name || '',
            customer_id: result.customer_id || '',
            pea_meter_id: result.pea_meter_id || '',
            code111: result.code111 || 0,
            code010: result.code010 || 0,
            code020: result.code020 || 0,
            code030: result.code030 || 0,
            code015_handwritten: result.code015_handwritten || 0,
            code015_printed: result.code015_printed || 0,
            code050: result.code050 || 0,
            code016_handwritten: result.code016_handwritten || 0,
            code016_printed: result.code016_printed || 0,
            code060: result.code060 || 0,
            code017_handwritten: result.code017_handwritten || 0,
            code017_printed: result.code017_printed || 0,
            code070: result.code070 || 0,
            code118_handwritten: result.code118_handwritten || 0,
            code118_printed: result.code118_printed || 0,
            code280: result.code280 || 0,
            reading_date: new Date().toISOString()
          });
          setView('reader');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('การวิเคราะห์รูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleSave = async () => {
    if (!currentReading) return;

    try {
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentReading)
      });

      if (response.ok) {
        alert('บันทึกข้อมูลสำเร็จ');
        fetchHistory();
        setView('home');
        setCurrentReading(null);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('บันทึกข้อมูลล้มเหลว');
    }
  };

  const calculateValidation = (data: MeterReading) => {
    const sum111 = data.code010 + data.code020 + data.code030;
    const diff015 = Math.abs(data.code015_handwritten - data.code015_printed);
    const diff016 = Math.abs(data.code016_handwritten - data.code016_printed);
    const diff017 = Math.abs(data.code017_handwritten - data.code017_printed);
    const diff118 = Math.abs(data.code118_handwritten - data.code118_printed);

    return {
      sum111,
      diff015,
      diff016,
      diff017,
      diff118,
      is111Valid: Math.abs(sum111 - data.code111) < 0.1,
      is015Valid: Math.abs(diff015 - data.code050) < 0.1,
      is016Valid: Math.abs(diff016 - data.code060) < 0.1,
      is017Valid: Math.abs(diff017 - data.code070) < 0.1,
      is118Valid: Math.abs(diff118 - data.code280) < 0.1,
    };
  };

  const filteredHistory = history.filter(item => 
    item.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.pea_meter_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans">
      <header className="bg-white border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => {
              setView('home');
              setCurrentReading(null);
              setSelectedReading(null);
            }}
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">TOU Master</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Meter Analytics</p>
            </div>
          </div>
          
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            ระบบอ่านมิเตอร์อัจฉริยะ
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Uploader Section */}
              <section className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">อัปโหลดรูปภาพมิเตอร์</h2>
                  <p className="text-zinc-500 text-sm">อัปโหลดรูปภาพเพื่อวิเคราะห์ข้อมูล TOU และตรวจสอบความถูกต้อง</p>
                </div>

                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group",
                    isDragActive ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 hover:border-emerald-400 hover:bg-zinc-50",
                    isAnalyzing && "pointer-events-none opacity-50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="max-w-xs mx-auto space-y-4">
                    <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      {isAnalyzing ? (
                        <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {isAnalyzing ? "กำลังวิเคราะห์ข้อมูล..." : "คลิกหรือลากรูปภาพมาวางที่นี่"}
                      </p>
                      <p className="text-xs text-zinc-400">รองรับไฟล์ภาพ JPG, PNG</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* History Section */}
              <section className="space-y-6 pt-6 border-t border-zinc-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-xl font-bold">ประวัติการบันทึกผล</h2>
                  </div>
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อ, หมายเลขผู้ใช้..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-black/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-400 text-left border-b border-zinc-50">
                          <th className="px-6 py-4 font-medium">วันที่</th>
                          <th className="px-6 py-4 font-medium">ชื่อผู้ใช้ไฟฟ้า</th>
                          <th className="px-6 py-4 font-medium">หมายเลขผู้ใช้</th>
                          <th className="px-6 py-4 font-medium">หมายเลขมิเตอร์</th>
                          <th className="px-6 py-4 font-medium text-right">รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {filteredHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                            <td className="px-6 py-4 text-zinc-500">
                              {format(new Date(item.reading_date), 'dd/MM/yy HH:mm')}
                            </td>
                            <td className="px-6 py-4 font-bold">{item.customer_name}</td>
                            <td className="px-6 py-4 text-zinc-500">{item.customer_id}</td>
                            <td className="px-6 py-4 text-zinc-500">{item.pea_meter_id}</td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedReading(item);
                                  setView('detail');
                                }}
                                className="text-emerald-500 font-bold hover:underline inline-flex items-center gap-1"
                              >
                                ดูข้อมูล
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                              ยังไม่มีข้อมูลประวัติการบันทึก
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {view === 'reader' && currentReading && (
            <motion.div 
              key="reader"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('home')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับ</span>
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  บันทึกข้อมูล
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Info Card */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                    <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest">ข้อมูลผู้ใช้ไฟฟ้า</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">ชื่อผู้ใช้ไฟฟ้า</label>
                        <input 
                          type="text" 
                          value={currentReading.customer_name}
                          onChange={(e) => setCurrentReading({...currentReading, customer_name: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">หมายเลขผู้ใช้ไฟฟ้า</label>
                        <input 
                          type="text" 
                          value={currentReading.customer_id}
                          onChange={(e) => setCurrentReading({...currentReading, customer_id: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">หมายเลขมิเตอร์ PEA</label>
                        <input 
                          type="text" 
                          value={currentReading.pea_meter_id}
                          onChange={(e) => setCurrentReading({...currentReading, pea_meter_id: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Validation Summary */}
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                    <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest">สรุปการตรวจสอบ</h3>
                    <div className="space-y-3">
                      {(() => {
                        const v = calculateValidation(currentReading);
                        return (
                          <>
                            <ValidationItem label="รหัส 111 (Total)" isValid={v.is111Valid} />
                            <ValidationItem label="รหัส 015 (050)" isValid={v.is015Valid} />
                            <ValidationItem label="รหัส 016 (060)" isValid={v.is016Valid} />
                            <ValidationItem label="รหัส 017 (070)" isValid={v.is017Valid} />
                            <ValidationItem label="รหัส 118 (280)" isValid={v.is118Valid} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-sm">รายละเอียดค่าที่อ่านได้</h3>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">หน่วย: kWh / kW</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-400 text-left border-b border-zinc-50">
                            <th className="px-6 py-3 font-medium">รหัส</th>
                            <th className="px-6 py-3 font-medium">รายการ</th>
                            <th className="px-6 py-3 font-medium text-right">ค่าที่อ่านได้</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          <DataRow code="111" label="Total Energy" value={currentReading.code111} />
                          <DataRow code="010" label="On-Peak Energy" value={currentReading.code010} />
                          <DataRow code="020" label="Off-Peak Energy" value={currentReading.code020} />
                          <DataRow code="030" label="Holiday Energy" value={currentReading.code030} />
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Analysis Box */}
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <AlertCircle className="w-5 h-5" />
                      <h3 className="font-bold">ผลการวิเคราะห์ทางเทคนิค</h3>
                    </div>
                    {(() => {
                      const v = calculateValidation(currentReading);
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <AnalysisCard 
                            label="ผลรวม 010+020+030" 
                            value={v.sum111} 
                            target={currentReading.code111} 
                            isValid={v.is111Valid} 
                            unit="kWh"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 015 (มือ-พิมพ์)" 
                            value={v.diff015} 
                            target={currentReading.code050} 
                            isValid={v.is015Valid} 
                            targetCode="050"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 016 (มือ-พิมพ์)" 
                            value={v.diff016} 
                            target={currentReading.code060} 
                            isValid={v.is016Valid} 
                            targetCode="060"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 017 (มือ-พิมพ์)" 
                            value={v.diff017} 
                            target={currentReading.code070} 
                            isValid={v.is017Valid} 
                            targetCode="070"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 118 (มือ-พิมพ์)" 
                            value={v.diff118} 
                            target={currentReading.code280} 
                            isValid={v.is118Valid} 
                            targetCode="280"
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedReading && (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('home')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>กลับไปที่หน้าหลัก</span>
                </button>
                <div className="flex items-center gap-3">
                   <button 
                    onClick={async () => {
                      if(confirm('ยืนยันการลบข้อมูล?')) {
                        alert('ฟังชั่นลบข้อมูลยังไม่เปิดใช้งานในเวอร์ชั่นทดสอบ');
                      }
                    }}
                    className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">วันที่บันทึก</p>
                    <p className="font-bold">{format(new Date(selectedReading.reading_date), 'dd MMMM yyyy HH:mm')}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                    <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest">ข้อมูลผู้ใช้ไฟฟ้า</h3>
                    <div className="space-y-4">
                      <DetailItem icon={<User className="w-4 h-4" />} label="ชื่อผู้ใช้" value={selectedReading.customer_name} />
                      <DetailItem icon={<FileText className="w-4 h-4" />} label="หมายเลขผู้ใช้" value={selectedReading.customer_id} />
                      <DetailItem icon={<Zap className="w-4 h-4" />} label="หมายเลขมิเตอร์" value={selectedReading.pea_meter_id} />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                    <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest">สถานะการตรวจสอบ</h3>
                    <div className="space-y-3">
                      {(() => {
                        const v = calculateValidation(selectedReading.data);
                        return (
                          <>
                            <ValidationItem label="รหัส 111 (Total)" isValid={v.is111Valid} />
                            <ValidationItem label="รหัส 015 (050)" isValid={v.is015Valid} />
                            <ValidationItem label="รหัส 016 (060)" isValid={v.is016Valid} />
                            <ValidationItem label="รหัส 017 (070)" isValid={v.is017Valid} />
                            <ValidationItem label="รหัส 118 (280)" isValid={v.is118Valid} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-zinc-50 bg-zinc-50/50">
                      <h3 className="font-bold text-sm">รายละเอียดค่าที่บันทึกไว้</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-400 text-left border-b border-zinc-50">
                            <th className="px-6 py-3 font-medium">รหัส</th>
                            <th className="px-6 py-3 font-medium">รายการ</th>
                            <th className="px-6 py-3 font-medium text-right">ค่าที่อ่านได้</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          <DataRow code="111" label="Total Energy" value={selectedReading.data.code111} />
                          <DataRow code="010" label="On-Peak Energy" value={selectedReading.data.code010} />
                          <DataRow code="020" label="Off-Peak Energy" value={selectedReading.data.code020} />
                          <DataRow code="030" label="Holiday Energy" value={selectedReading.data.code030} />
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Analysis Box for Detail View */}
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <AlertCircle className="w-5 h-5" />
                      <h3 className="font-bold">ผลการวิเคราะห์ทางเทคนิค</h3>
                    </div>
                    {(() => {
                      const v = calculateValidation(selectedReading.data);
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <AnalysisCard 
                            label="ผลรวม 010+020+030" 
                            value={v.sum111} 
                            target={selectedReading.data.code111} 
                            isValid={v.is111Valid} 
                            unit="kWh"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 015 (มือ-พิมพ์)" 
                            value={v.diff015} 
                            target={selectedReading.data.code050} 
                            isValid={v.is015Valid} 
                            targetCode="050"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 016 (มือ-พิมพ์)" 
                            value={v.diff016} 
                            target={selectedReading.data.code060} 
                            isValid={v.is016Valid} 
                            targetCode="060"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 017 (มือ-พิมพ์)" 
                            value={v.diff017} 
                            target={selectedReading.data.code070} 
                            isValid={v.is017Valid} 
                            targetCode="070"
                          />
                          <AnalysisCard 
                            label="ผลต่าง 118 (มือ-พิมพ์)" 
                            value={v.diff118} 
                            target={selectedReading.data.code280} 
                            isValid={v.is118Valid} 
                            targetCode="280"
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ValidationItem({ label, isValid }: { label: string, isValid: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {isValid ? (
        <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          <span>ถูกต้อง</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold">
          <AlertCircle className="w-3 h-3" />
          <span>ไม่ถูกต้อง</span>
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">{label}</p>
        <p className="font-bold text-sm">{value || '-'}</p>
      </div>
    </div>
  );
}

function AnalysisCard({ label, value, target, isValid, unit, targetCode }: { 
  label: string, 
  value: number, 
  target: number, 
  isValid: boolean,
  unit?: string,
  targetCode?: string
}) {
  return (
    <div className="bg-white/60 p-4 rounded-xl border border-white/40 shadow-sm">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-bold text-lg tabular-nums">
        {value.toFixed(2)} 
        <span className="text-xs font-normal text-zinc-400 ml-2">vs {target.toFixed(2)}</span>
      </p>
      <p className={cn("text-[10px] mt-1 font-bold flex items-center gap-1", isValid ? "text-emerald-600" : "text-rose-600")}>
        {isValid ? (
          <><CheckCircle2 className="w-3 h-3" /> {targetCode ? `ตรงกับรหัส ${targetCode}` : "ค่าตรงกัน"}</>
        ) : (
          <><AlertCircle className="w-3 h-3" /> {targetCode ? `ไม่ตรงกับรหัส ${targetCode}` : "ค่าไม่ตรงกัน"}</>
        )}
      </p>
    </div>
  );
}

function DataRow({ code, label, value }: { code: string, label: string, value: number }) {
  return (
    <tr className="hover:bg-zinc-50/30 transition-colors">
      <td className="px-6 py-4 font-mono text-emerald-600 font-bold">{code}</td>
      <td className="px-6 py-4 text-zinc-600">{label}</td>
      <td className="px-6 py-4 text-right font-bold tabular-nums">{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  );
}
