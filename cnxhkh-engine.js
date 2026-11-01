(function(){
'use strict';
const raw=window.CNXH_RAW_SOURCES||[];
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/[\t\r\n]+/g,' ').replace(/\s+/g,' ').trim();
const mcqs=[],exams=[],flashcards=[],needsReview=[],byPrompt=new Map(),meta={sources:[],bySource:{},scannedFile:'TN-CNXHKH.docx'};
const spec=[
 ['131120I','Chưa xác minh','131120I-1-1.doc',40],
 ['131120II','Chưa xác minh','131120II (1) (1) (1).doc',40],
 ['2223II','2022–2023','Đợt-1-HK-2-2023.doc',40],
 ['DE-ON-01','Chưa xác minh','3-de-on-trac-nghiem-cnxhkh (1).pdf',50],
 ['DE-ON-02','Chưa xác minh','3-de-on-trac-nghiem-cnxhkh (1).pdf',40]
];
const chapterPattern=/(?:^|[\n])\s*CHƯƠNG\s*([1-7])\s*[:\-–]/gim;
function findChapter(text,offset){
 const re=new RegExp(chapterPattern.source,'gim');let ch=0,m;
 while((m=re.exec(text))&&m.index<=offset)ch=Number(m[1]);
 return ch;
}
function optionMarks(segment){
 const all=[...segment.matchAll(/(?:^|[\n]|\s)([A-Da-d])\.\s*/g)];
 for(let i=0;i<all.length;i++){
  if(all[i][1].toUpperCase()!=='A')continue;
  const found=[all[i]];let p=i;
  for(const expected of ['B','C','D']){
   const k=all.findIndex((x,j)=>j>p&&x[1].toUpperCase()===expected);
   if(k<0){found.length=0;break;}found.push(all[k]);p=k;
  }
  if(found.length===4)return found;
 }
 return null;
}
function parseMultiple(d){
 const text=d.text.replace(/\r/g,'\n');
 const mixed=d.type==='mcq-mixed';
 const re=mixed?/(?:^|\n)\s*(?:Câu\s*(?:hỏi\s*)?)?(\d{1,3})[.:]\s*(?:\[LX\d+\])?/gim:/\bCâu\s*(?:hỏi\s*)?(\d{1,3})\s*[.:]/gim;
 let points=[...text.matchAll(re)].filter(m=>Number(m[1])>=1&&Number(m[1])<=300);
 if(mixed)points=points.filter(m=>/\[LX\d+\]/i.test(m[0])||/Câu/i.test(m[0]));
 let batch=1,prev=0,accepted=0;
 for(let i=0;i<points.length;i++){
  const m=points[i],n=+m[1];if(n===1&&prev>1)batch++;prev=n;
  const segment=text.slice(m.index+m[0].length,points[i+1]?.index||text.length);
  const markers=optionMarks(segment);
  const group=d.type==='exam'?(d.code||''):d.type==='exam-pdf'?'DE-ON-'+String(batch).padStart(2,'0'):'';
  const prefix=d.type==='exam'?'EX'+d.code:d.type==='exam-pdf'?'EXPDF':d.type==='mcq-chapters'?'HUB7':d.type==='mcq-unassigned'?'CNXH1':'HUBM';
  const id=prefix+'-'+String(batch).padStart(2,'0')+'-Q'+String(i+1).padStart(3,'0');
  if(!markers){needsReview.push({source:d.name,code:group,number:n,reason:'Không tách đủ 4 phương án',excerpt:clean(segment.slice(0,220))});continue;}
  let question=clean(segment.slice(0,markers[0].index));
  if(question.length<10||question.length>2200){needsReview.push({source:d.name,code:group,number:n,reason:'Câu hỏi không đọc được trọn vẹn',excerpt:question.slice(0,180)});continue;}
  const options=markers.map((mark,j)=>{
   let t=segment.slice(mark.index+mark[0].length,markers[j+1]?.index||segment.length);
   if(j===3)t=t.split(/(?:^|\n)\s*(?:Giải thích\s*:|CHƯƠNG\s*[1-7]|TRẮC NGHIỆM E-LEARNING|HẾT\b)/im)[0];
   return clean(t).replace(/^\*/,'').trim();
  });
  if(options.some(x=>x.length<1||x.length>950)){needsReview.push({source:d.name,code:group,number:n,reason:'Phương án bị dính hoặc thiếu',excerpt:question});continue;}
  const marked=markers.map((mark,j)=>/^\s*\*/.test(segment.slice(mark.index+mark[0].length,markers[j+1]?.index||segment.length)));
  const key=marked.filter(Boolean).length===1?marked.indexOf(true):-1;
  const chapter=d.type==='mcq-chapters'?findChapter(text,m.index):0;
  mcqs.push({id,chapter,number:n,question,options:options.map((t,j)=>({id:id+'-O'+(j+1),text:t})),correctOptionId:key>=0?id+'-O'+(key+1):null,explanation:key>=0?'Đáp án được đánh dấu (*) trong tài liệu nguồn.':'Tài liệu nguồn chưa xác định đáp án đúng; câu không tính điểm.',source:d.name,topic:group?'Mã đề '+group:chapter?'Chương '+chapter:'Câu bổ sung chưa phân chương',examCode:group||null});
  accepted++;
 }
 meta.bySource[d.name]={identified:points.length,accepted,review:points.length-accepted};
}
for(const d of raw.filter(d=>['exam','exam-pdf','mcq-mixed','mcq-chapters','mcq-unassigned'].includes(d.type)))parseMultiple(d);
for(const [code,year,source,expected] of spec){
 const hits=mcqs.filter(q=>q.examCode===code);
 exams.push({code,year,source,expected,questionIds:hits.map(q=>q.id),scored:hits.filter(q=>q.correctOptionId).length});
}
const patterns=[
[1,/nhap mon|doi tuong nghien cuu|phat kien|khong tuong|tomat moro|babop|phurie|saint simon|owen|utopi|duy vat lich su/],
[2,/giai cap cong nhan|su menh lich su|dang cong san|cong nghiep hien dai|cong nhan viet nam/],
[3,/thoi ky qua do|qua do len|hinh thai kinh te xa hoi|giai doan cao|thoi ky dau cua chu nghia cong san/],
[4,/dan chu|nha nuoc|chuyen chinh vo san|bo may nha nuoc|quyen luc nha nuoc/],
[5,/lien minh giai cap|lien minh cong nong|co cau xa hoi|tang lop xa hoi|giai cap nong dan|tang lop tri thuc/],
[6,/dan toc|ton giao|tin nguong|quyen dan toc|tu do tin nguong/],
[7,/gia dinh|hon nhan|vo chong|phu nu|ly hon|nuoi duong|huyet thong/]
];
function addQA(question,answer,source){
 question=clean(question);answer=clean(answer);
 if(question.length<12||question.length>1800||/^([A-ZĐ]|[0-9]{1,3})$/.test(question))return;
 const key=normalize(question);
 if(key.length<11)return;
 const prev=byPrompt.get(key);
 if(prev){if(!prev.sources.includes(source))prev.sources.push(source);if(answer&&answer!==prev.answer&&!prev.alternatives.includes(answer))prev.alternatives.push(answer);return;}
 const matching=patterns.filter(([ch,re])=>re.test(key));
 const ch=matching.length===1?matching[0][0]:0;
 const item={id:'F'+String(flashcards.length+1).padStart(4,'0'),question,answer,chapter:ch,sources:[source],alternatives:[]};
 byPrompt.set(key,item);flashcards.push(item);
}
for(const d of raw.filter(d=>d.type==='qa')){
 const lines=d.text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 for(const line of lines){
  if(line.length<15||/^[A-ZĐ]{1,2}$/.test(line)||/^(?:BA=A|CHƯƠNG|CNXHKH_CHECKED)/i.test(line))continue;
  let idx=line.lastIndexOf('?'),size=1;
  if(idx<10){idx=line.lastIndexOf('-->');size=3;}
  if(idx<10){idx=line.lastIndexOf('->');size=2;}
  if(idx<10){idx=line.lastIndexOf(':');size=1;}
  let q=line,a='';
  if(idx>=12&&idx<line.length-2){q=line.slice(0,idx+(line[idx]==='?'?1:0));a=line.slice(idx+size);}
  addQA(q,a,d.name);
 }
}
for(const d of raw.filter(d=>d.type==='qa-numbered')){
 const s=d.text;
 const matches=[...s.matchAll(/(?:^|\n)\s*\d{1,2}\.\s+[^\n]+/g)];
 for(let i=0;i<matches.length;i++){
  const part=s.slice(matches[i].index,matches[i+1]?.index||s.length);
  const m=part.match(/([\s\S]+?)\s*->\s*([\s\S]+)/);
  if(m)addQA(m[1].replace(/^\s*\d+\.\s*/,'').replace(/\n[A-ZĐ]\s*$/,''),m[2].replace(/\n[A-ZĐ]\s*$/,''),d.name);
 }
}
meta.sources=raw.map(x=>({name:x.name,type:x.type,characters:x.text.length}));
meta.totalMultiple=mcqs.length;meta.totalQA=flashcards.length;meta.review=needsReview.length;
meta.folder='https://drive.google.com/drive/folders/1xrUth9o0oOUF2gsc7C7JEh17ri1WLSRg';
window.CNXH_ADDONS={mcqs,exams,flashcards,needsReview,meta};
})();