/**
 * Generates presentation/enjazaty-pitch.pptx — a 6-slide Arabic (RTL) pitch
 * deck for Enjazaty, matching the HTML deck.
 *
 * Run:  npm i pptxgenjs --no-save && node presentation/build-pptx.js
 */
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const C = {
  saffron: 'F4B000',
  saffronD: 'D99A00',
  ink: '1F2937',
  muted: '6B7280',
  soft: 'FFF8E6',
  border: 'F3E2B3',
  white: 'FFFFFF',
};
const FONT = 'Arial';
const ICON = path.resolve(__dirname, '../assets/icon.png');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
pptx.rtlMode = true;
const W = 13.33;

/** Common slide chrome: white bg + saffron accent bar on the right (RTL). */
function base(slide, soft = false) {
  slide.background = { color: soft ? C.soft : C.white };
  slide.addShape('rect', { x: W - 0.28, y: 0, w: 0.28, h: 7.5, fill: { color: C.saffron } });
}

function tag(slide, text) {
  slide.addShape('roundRect', {
    x: 9.9, y: 0.55, w: 2.75, h: 0.55, rectRadius: 0.27,
    fill: { color: C.soft }, line: { color: C.border, width: 1 },
  });
  slide.addText(text, {
    x: 9.9, y: 0.55, w: 2.75, h: 0.55, align: 'center', valign: 'middle',
    fontFace: FONT, fontSize: 14, bold: true, color: C.saffronD, rtlMode: true,
  });
}

// Title with an optional saffron-highlighted part (array of runs).
function heading(slide, runs, y = 1.35) {
  slide.addText(
    runs.map((r) => ({ text: r.t, options: { color: r.a ? C.saffronD : C.ink } })),
    { x: 0.7, y, w: 11.9, h: 1.3, align: 'right', fontFace: FONT, fontSize: 34, bold: true, rtlMode: true }
  );
}

// Bullet list: items = [{icon, text, bold?}]
function bullets(slide, items, y = 2.9) {
  const para = [];
  items.forEach((it, i) => {
    para.push({ text: `${it.icon}   `, options: { color: C.saffronD, fontSize: 22, bold: true } });
    para.push({
      text: it.text,
      options: {
        color: it.bold ? C.ink : C.muted, bold: !!it.bold, fontSize: 21,
        breakLine: true, paraSpaceAfter: 16,
      },
    });
  });
  slide.addText(para, {
    x: 0.7, y, w: 11.9, h: 4, align: 'right', valign: 'top', fontFace: FONT, rtlMode: true, lineSpacingMultiple: 1.1,
  });
}

// Three feature cards (RTL order: right → left).
function cards(slide, items, y = 3.0) {
  const gap = 0.4, cw = (11.9 - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = W - 0.7 - cw - i * (cw + gap);
    slide.addShape('roundRect', { x, y, w: cw, h: 3.0, rectRadius: 0.18, fill: { color: C.white }, line: { color: C.border, width: 1 } });
    slide.addText(it.icon, { x, y: y + 0.25, w: cw, h: 0.8, align: 'center', fontSize: 34 });
    slide.addText(it.title, { x: x + 0.15, y: y + 1.05, w: cw - 0.3, h: 0.6, align: 'center', fontFace: FONT, fontSize: 20, bold: true, color: C.ink, rtlMode: true });
    slide.addText(it.body, { x: x + 0.2, y: y + 1.6, w: cw - 0.4, h: 1.3, align: 'center', valign: 'top', fontFace: FONT, fontSize: 15, color: C.muted, rtlMode: true });
  });
}

/* ----------------------------- Slide 1: Title ---------------------------- */
let s = pptx.addSlide();
base(s, true);
s.addImage({ path: ICON, x: (W - 2.1) / 2, y: 1.15, w: 2.1, h: 2.1 });
s.addText('إنجازاتي', { x: 0, y: 3.5, w: W, h: 1.1, align: 'center', fontFace: FONT, fontSize: 54, bold: true, color: C.ink, rtlMode: true });
s.addText('مساحة ذكية لإدارة وتوثيق واعتماد الإنجازات المهنية — على الويب والجوال', {
  x: 1, y: 4.6, w: W - 2, h: 0.8, align: 'center', fontFace: FONT, fontSize: 20, color: C.muted, rtlMode: true,
});
s.addText('عرض تقديمي للمسؤولين', { x: 0, y: 5.5, w: W, h: 0.5, align: 'center', fontFace: FONT, fontSize: 14, bold: true, color: C.saffronD, rtlMode: true });

/* ---------------------------- Slide 2: Problem --------------------------- */
s = pptx.addSlide(); base(s);
tag(s, 'المشكلة');
heading(s, [{ t: 'توثيق الإنجازات واعتمادها ' }, { t: 'مبعثر وبطيء', a: true }]);
bullets(s, [
  { icon: '✕', text: 'الإنجازات موزّعة بين الورق والرسائل والملفات المتفرقة، ويصعب الرجوع إليها.' },
  { icon: '✕', text: 'تقييم الموظفين واعتماد أعمالهم يدوي، دون سجلّ موحّد أو توقيع موثّق.' },
  { icon: '✕', text: 'إعداد التقارير الإدارية يستهلك وقتاً كبيراً، وبلا صلاحيات واضحة بين المسؤول والموظف.' },
]);

/* ---------------------------- Slide 3: Solution -------------------------- */
s = pptx.addSlide(); base(s);
tag(s, 'الحل');
heading(s, [{ t: 'منصّة واحدة ' }, { t: 'لكل رحلة الإنجاز', a: true }]);
s.addText('«إنجازاتي» يجمع الإضافة والتنظيم والتقييم والاعتماد والتقارير في مكان واحد، بصلاحيات دقيقة للمسؤول والموظف.', {
  x: 0.7, y: 2.5, w: 11.9, h: 0.9, align: 'right', fontFace: FONT, fontSize: 19, color: C.ink, rtlMode: true,
});
cards(s, [
  { icon: '📁', title: 'تنظيم ذكي', body: 'مجلدات ومجلدات فرعية للإنجازات والملفات والمرفقات.' },
  { icon: '⭐', title: 'تقييم واعتماد', body: 'تقييم المسؤول للموظف مع توقيع إلكتروني يُقفل بعد الاعتماد.' },
  { icon: '📄', title: 'تقارير جاهزة', body: 'تقرير احترافي قابل للطباعة والمشاركة كـ PDF.' },
], 3.6);

/* -------------------------- Slide 4: How it works ------------------------ */
s = pptx.addSlide(); base(s);
tag(s, 'كيف يعمل');
heading(s, [{ t: 'ثلاث خطوات ' }, { t: 'بسيطة', a: true }]);
bullets(s, [
  { icon: '1', text: 'الموظف يضيف إنجازاته ومرفقاته (صور/ملفات/فيديو/روابط) وينظّمها في مجلدات.' },
  { icon: '2', text: 'المسؤول يضيف الموظف بمعرّفه، يطّلع على ملفاته، ويقيّمها ويعتمدها بتوقيعه.' },
  { icon: '3', text: 'يصل التقييم كتقرير في نشاط الموظف، ويُصدَّر تقرير الإنجازات ويُشارَك PDF.' },
  { icon: '🔒', text: 'أمان وحوكمة: صلاحيات دقيقة تُظهر لكل مستخدم ما يخصّه فقط، وسجلّ اعتماد موثّق بالتوقيع.', bold: true },
]);

/* ---------------------------- Slide 5: Benefit --------------------------- */
s = pptx.addSlide(); base(s);
tag(s, 'الفائدة المنتظرة');
heading(s, [{ t: 'قيمة ملموسة ' }, { t: 'للإدارة والموظف', a: true }]);
const kpis = [
  { icon: '⌛', label: 'توثيق واعتماد أسرع بدل العمل الورقي' },
  { icon: '📚', label: 'سجلّ موحّد ومنظّم للإنجازات' },
  { icon: '✅', label: 'تقييم عادل موثّق بالتوقيع الإلكتروني' },
  { icon: '📈', label: 'تقارير جاهزة تدعم القرار الإداري' },
];
const kg = 0.4, kw = (11.9 - kg * 3) / 4;
kpis.forEach((k, i) => {
  const x = W - 0.7 - kw - i * (kw + kg);
  s.addShape('roundRect', { x, y: 3.1, w: kw, h: 2.6, rectRadius: 0.18, fill: { color: C.white }, line: { color: C.border, width: 1 } });
  s.addText(k.icon, { x, y: 3.35, w: kw, h: 1.0, align: 'center', fontSize: 42 });
  s.addText(k.label, { x: x + 0.15, y: 4.4, w: kw - 0.3, h: 1.1, align: 'center', valign: 'top', fontFace: FONT, fontSize: 15, color: C.muted, rtlMode: true });
});

/* ------------------------- Slide 6: Ask / Next step --------------------- */
s = pptx.addSlide(); base(s, true);
tag(s, 'الطلب / الخطوة التالية');
heading(s, [{ t: 'نطلب ' }, { t: 'موافقتكم على تجربة تجريبية', a: true }]);
bullets(s, [
  { icon: '✅', text: 'تشغيل تجربة تجريبية (Pilot) في إدارة أو منطقة تعليمية محددة لمدة شهر.', bold: true },
  { icon: '📊', text: 'قياس النتائج (سرعة الاعتماد، تنظيم الإنجازات، رضا المستخدمين) ثم التوسّع بناءً عليها.' },
  { icon: '🚀', text: 'التطبيق جاهز للتجربة الآن على الويب والجوال — لا يتطلب بنية تحتية إضافية.' },
], 2.8);
s.addShape('roundRect', { x: 9.4, y: 5.55, w: 3.25, h: 0.7, rectRadius: 0.14, fill: { color: C.saffron } });
s.addText('تجربة التطبيق الآن', {
  x: 9.4, y: 5.55, w: 3.25, h: 0.7, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 16, bold: true, color: C.white, rtlMode: true,
  hyperlink: { url: 'https://enjazaty-app--l5yd8tiv0z.expo.app' },
});
s.addText('تطوير: هنادي المري', { x: 0.7, y: 6.6, w: 6, h: 0.4, align: 'right', fontFace: FONT, fontSize: 13, color: C.muted, rtlMode: true });

pptx.writeFile({ fileName: path.resolve(__dirname, 'enjazaty-pitch.pptx') }).then((f) => {
  console.log('created', f);
});
