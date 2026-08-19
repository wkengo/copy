(()=>{'use strict';

const KEY='copy-button-manager:v1';
const content=document.querySelector('#content');
const root=document.querySelector('#modal-root');
const file=document.querySelector('#csv-file');
const COLORS=Object.freeze({
  '薄青色':'#DDEBF7',
  '青色':'#9DC3E6',
  '薄緑色':'#E2F0D9',
  '緑色':'#A9D18E',
  '薄紫色':'#E4DFEC',
  '紫色':'#B4A7D6'
});
let items=[];
let editing=false;
let dragId=null;
let dragCategory=null;
let categoryHoverTarget=null;

const tooltipPositionStyle=document.createElement('style');
tooltipPositionStyle.textContent='.tooltip.tooltipBelow{top:calc(100% + 9px);bottom:auto}.tooltip.tooltipBelow:after{top:auto;bottom:100%;border-top-color:transparent;border-bottom-color:#182433}.copyCard:not(.editing):hover{z-index:40}';
document.head.appendChild(tooltipPositionStyle);

const buttonModalStyle=document.createElement('style');
buttonModalStyle.textContent='.buttonModal{width:min(100%,800px)}.buttonModal .modalHeader{align-items:center;margin-bottom:18px}.modalHeaderActions{display:flex;align-items:center;justify-content:flex-end;gap:8px}.modalHeaderActions .secondary,.modalHeaderActions .primary{height:38px;padding:0 15px;border-radius:9px;font-size:13px;font-weight:700}.buttonModal form{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"display category" "copy color" "copy note";gap:15px 18px}.fieldDisplay{grid-area:display}.fieldCopy{grid-area:copy}.fieldCategory{grid-area:category}.fieldColor{grid-area:color}.fieldNote{grid-area:note}.fieldCopy textarea{height:100%;min-height:174px}@media(width<=700px){.buttonModal .modalHeader{display:grid;grid-template-columns:1fr;gap:12px}.modalHeaderActions{justify-content:flex-start;flex-wrap:wrap}.buttonModal form{grid-template-columns:1fr;grid-template-areas:none}.fieldDisplay,.fieldCopy,.fieldCategory,.fieldColor,.fieldNote{grid-area:auto}.fieldCopy textarea{height:auto;min-height:110px}}';
document.head.appendChild(buttonModalStyle);

try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'[]');
  items=Array.isArray(saved)?saved.map(x=>({...x,category:normalizeCategory(x.category),color:normalizeColor(x.color)})):[];
}catch{}

const id=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function normalizeCategory(value){
  const category=String(value??'').trim();
  return category||'未分類';
}

function normalizeColor(value){
  const color=String(value??'').trim();
  return Object.hasOwn(COLORS,color)?color:'';
}

function colorCode(value){
  return COLORS[normalizeColor(value)]||'#FFFFFF';
}

function moveCategoryBefore(sourceCategory,targetCategory){
  const order=[];
  items.forEach(item=>{
    const category=normalizeCategory(item.category);
    if(!order.includes(category))order.push(category);
  });
  const from=order.indexOf(sourceCategory);
  const to=order.indexOf(targetCategory);
  if(from<0||to<0||from===to)return false;
  const moved=order.splice(from,1)[0];
  order.splice(to,0,moved);
  items=order.flatMap(category=>items.filter(item=>normalizeCategory(item.category)===category));
  return true;
}

function toast(message){
  document.querySelector('#toast-root').innerHTML=`<div class="toast" role="status">✓ ${esc(message)}</div>`;
  setTimeout(()=>document.querySelector('#toast-root').replaceChildren(),2400);
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(items));
  render();
}

function render(){
  document.querySelector('#edit').textContent=editing?'完了':'編集';
  document.querySelector('#edit').classList.toggle('active',editing);

  if(!items.length){
    content.innerHTML='<div class="emptyState"><div class="emptyIcon" aria-hidden="true"><span></span><span></span><span></span></div><h3>ボタンはまだありません</h3><p>右下の「＋」から、よく使う文字列を登録してください。</p></div>';
    return;
  }

  const categoryNames=[];
  const groups=new Map();

  items.forEach(item=>{
    const category=normalizeCategory(item.category);
    item.category=category;
    if(!groups.has(category)){
      groups.set(category,[]);
      categoryNames.push(category);
    }
    groups.get(category).push(item);
  });

  content.innerHTML=`<div class="categoryGrid">${categoryNames.map(category=>`
    <section class="categoryColumn" data-category-column="${esc(category)}">
      <h2 class="categoryTitle ${editing?'categoryTitleEditing':''}">${editing?`<button class="categoryDragHandle" data-category-drag="${esc(category)}" aria-label="${esc(category)}カテゴリを移動">⠿</button>`:''}<span>${esc(category)}</span></h2>
      <div class="categoryButtons">
        ${groups.get(category).map(item=>cardHtml(item)).join('')}
      </div>
    </section>
  `).join('')}</div>`;
}

function cardHtml(item){
  return `<article data-button-id="${item.id}" class="copyCard ${editing?'editing':''}" style="background:${colorCode(item.color)}">
    ${editing?`<button class="dragHandle" data-drag="${item.id}" aria-label="${esc(item.displayText)}を移動">⠿</button>`:''}
    <button class="copyArea" data-copy="${item.id}" ${editing?'disabled':''}>${esc(item.displayText)}</button>
    ${item.note||item.copyText?`<span class="tooltip ${item.note?'hasNote':''}">${item.note?`<span class="tooltipNote">${esc(item.note)}</span>`:''}<span class="tooltipCopy">${esc(item.copyText)}</span></span>`:''}
    ${editing?`<div class="cardActions"><button data-edit="${item.id}" aria-label="編集">✎</button><button class="danger" data-delete="${item.id}" aria-label="削除">×</button></div>`:''}
  </article>`;
}

function help(){
  root.innerHTML=`<div class="modalBackdrop helpBackdrop">
    <section class="modal helpModal" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="modalHeader">
        <div><span class="eyebrow">HOW TO USE</span><h2 id="help-title">使い方</h2></div>
        <button class="closeButton" type="button" aria-label="使い方を閉じる">×</button>
      </div>
      <p class="helpIntro">よく使う文章をボタンに登録し、必要なときにワンクリックでコピーできます。</p>
      <ol class="helpSteps">
        <li class="helpStep"><span class="helpStepNumber">1</span><div><h3>ボタンを追加する</h3><p>右下の「＋」を押し、カテゴリ、表示文字列、コピーする文字列、色を入力します。補足は必要な場合だけ入力してください。</p></div></li>
        <li class="helpStep"><span class="helpStepNumber">2</span><div><h3>文章をコピーする</h3><p>目的のボタンを押すと、登録した文章がクリップボードへコピーされます。貼り付け先で <kbd>Ctrl</kbd> ＋ <kbd>V</kbd> を押してください。</p></div></li>
        <li class="helpStep"><span class="helpStepNumber">3</span><div><h3>登録内容を確認する</h3><p>パソコンではボタンにマウスを合わせると、補足とコピーする文字列が表示されます。</p></div></li>
        <li class="helpStep"><span class="helpStepNumber">4</span><div><h3>編集・並べ替え・削除する</h3><p>上部の「編集」を押します。カテゴリ見出しのつまみでカテゴリ列を、各ボタンの左側のつまみでカテゴリ内のボタンを並べ替えます。鉛筆ボタンで内容を変更し、「×」で削除します。最後に「完了」を押してください。</p></div></li>
        <li class="helpStep"><span class="helpStepNumber">5</span><div><h3>CSVでバックアップする</h3><p>「エクスポート」で登録内容をCSVに保存できます。「インポート」でCSVから一括登録または復元できます。</p></div></li>
      </ol>
      <div class="helpNotice"><strong>端末内保存について</strong><p>登録内容は、このブラウザ内に保存されます。ブラウザのデータを削除した場合や別の端末へ移る場合に備え、定期的にCSVをエクスポートしてください。</p></div>
      <div class="modalActions"><button type="button" class="primary helpDone">閉じる</button></div>
    </section>
  </div>`;

  const close=()=>{
    document.removeEventListener('keydown',onKeydown);
    root.replaceChildren();
  };
  const onKeydown=event=>{
    if(event.key==='Escape')close();
  };
  root.querySelector('.closeButton').onclick=close;
  root.querySelector('.helpDone').onclick=close;
  root.querySelector('.helpBackdrop').onclick=event=>{
    if(event.target===event.currentTarget)close();
  };
  document.addEventListener('keydown',onKeydown);
  root.querySelector('.closeButton').focus();
}

function form(item){
  const isEdit=!!item;
  const selectedColor=normalizeColor(item?.color);
  root.innerHTML=`<div class="modalBackdrop">
    <section class="modal buttonModal" role="dialog" aria-modal="true">
      <div class="modalHeader">
        <div><span class="eyebrow">BUTTON SETTINGS</span><h2>${isEdit?'ボタンを編集':'新しいボタン'}</h2></div>
        <div class="modalHeaderActions">
          <button type="button" class="secondary cancel">キャンセル</button>
          <button type="submit" form="buttonForm" class="primary">${isEdit?'更新する':'追加する'}</button>
          <button class="closeButton" type="button" aria-label="編集画面を閉じる">×</button>
        </div>
      </div>
      <form id="buttonForm">
        <label class="fieldDisplay">表示文字列 <em>必須</em>
          <input name="display" maxlength="80" required placeholder="例：メールアドレス" value="${esc(item?.displayText||'')}">
        </label>
        <label class="fieldCopy">コピーする文字列
          <textarea name="copy" rows="4" placeholder="クリックしたときにコピーする内容">${esc(item?.copyText||'')}</textarea>
        </label>
        <label class="fieldCategory">カテゴリ <span class="optional">空欄の場合は未分類</span>
          <input name="category" maxlength="80" placeholder="例：メール" value="${esc(item?.category==='未分類'?'':item?.category||'')}">
        </label>
        <label class="fieldColor">色
          <select name="color">
            <option value="" ${selectedColor===''?'selected':''}>指定なし（白色）</option>
            ${Object.keys(COLORS).map(color=>`<option value="${esc(color)}" ${selectedColor===color?'selected':''}>${esc(color)}</option>`).join('')}
          </select>
        </label>
        <label class="fieldNote">補足 <span class="optional">任意・PCのみ表示</span>
          <textarea name="note" rows="3" placeholder="マウスを合わせたときに表示する説明">${esc(item?.note||'')}</textarea>
        </label>
      </form>
    </section>
  </div>`;

  const close=()=>root.replaceChildren();
  root.querySelector('.closeButton').onclick=close;
  root.querySelector('.cancel').onclick=close;
  root.querySelector('form').onsubmit=event=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const next={
      id:item?.id||id(),
      category:normalizeCategory(data.get('category')),
      displayText:String(data.get('display')||'').trim(),
      copyText:String(data.get('copy')||''),
      note:String(data.get('note')||''),
      color:normalizeColor(data.get('color'))
    };
    items=isEdit?items.map(x=>x.id===item.id?next:x):[...items,next];
    save();
    close();
    toast(isEdit?'ボタンを更新しました':'ボタンを追加しました');
  };
  root.querySelector('input[name="category"]').focus();
}

content.addEventListener('click',async event=>{
  const button=event.target.closest('button');
  if(!button)return;
  const find=key=>items.find(x=>x.id===button.dataset[key]);

  if(button.dataset.copy&&!editing){
    const item=find('copy');
    try{
      await navigator.clipboard.writeText(item.copyText);
      toast(`「${item.displayText}」をコピーしました`);
    }catch{
      toast('コピーできませんでした。HTTPSで開いてください');
    }
  }

  if(button.dataset.edit)form(find('edit'));

  if(button.dataset.delete){
    const item=find('delete');
    if(confirm(`「${item.displayText}」を削除しますか？`)){
      items=items.filter(x=>x.id!==item.id);
      save();
      toast('ボタンを削除しました');
    }
  }
});

content.addEventListener('mouseover',event=>{
  const card=event.target.closest('.copyCard');
  if(!card||card.contains(event.relatedTarget))return;
  const tooltip=card.querySelector('.tooltip');
  if(!tooltip)return;
  tooltip.classList.remove('tooltipBelow');
  const tooltipRect=tooltip.getBoundingClientRect();
  const topbarBottom=document.querySelector('.topbar')?.getBoundingClientRect().bottom||0;
  if(tooltipRect.top<topbarBottom+8)tooltip.classList.add('tooltipBelow');
});

content.addEventListener('pointerdown',event=>{
  const categoryHandle=event.target.closest('[data-category-drag]');
  if(categoryHandle){
    dragCategory=categoryHandle.dataset.categoryDrag;
    categoryHoverTarget=null;
    categoryHandle.setPointerCapture(event.pointerId);
    document.body.classList.add('is-dragging');
    return;
  }
  const handle=event.target.closest('[data-drag]');
  if(!handle)return;
  dragId=handle.dataset.drag;
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add('is-dragging');
});

content.addEventListener('pointermove',event=>{
  if(dragCategory){
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-category-column]');
    const targetCategory=target?.dataset.categoryColumn;
    if(!targetCategory||targetCategory===dragCategory||targetCategory===categoryHoverTarget)return;
    categoryHoverTarget=targetCategory;
    if(moveCategoryBefore(dragCategory,targetCategory))render();
    return;
  }
  if(!dragId)return;
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-button-id]');
  if(!target||target.dataset.buttonId===dragId)return;
  const dragged=items.find(x=>x.id===dragId);
  const destination=items.find(x=>x.id===target.dataset.buttonId);
  if(!dragged||!destination||normalizeCategory(dragged.category)!==normalizeCategory(destination.category))return;
  const from=items.findIndex(x=>x.id===dragId);
  const to=items.findIndex(x=>x.id===target.dataset.buttonId);
  const moved=items.splice(from,1)[0];
  items.splice(to,0,moved);
  render();
});

const drop=()=>{
  if(dragId||dragCategory){
    const categoryWasMoved=!!dragCategory;
    dragId=null;
    dragCategory=null;
    categoryHoverTarget=null;
    document.body.classList.remove('is-dragging');
    save();
    toast(categoryWasMoved?'カテゴリの順番を保存しました':'ボタンの順番を保存しました');
  }
};

document.addEventListener('pointerup',drop);
document.addEventListener('pointercancel',drop);

document.querySelector('#add').onclick=()=>form();
document.querySelector('#help').onclick=help;
document.querySelector('#edit').onclick=()=>{
  editing=!editing;
  render();
};
document.querySelector('#import').onclick=()=>file.click();

const cell=value=>`"${String(value??'').replaceAll('"','""')}"`;

document.querySelector('#export').onclick=()=>{
  if(!items.length)return toast('エクスポートするボタンがありません');
  const lines=[
    ['order','category','display_text','copy_text','note','color'].map(cell).join(','),
    ...items.map((item,index)=>[
      index+1,
      normalizeCategory(item.category),
      item.displayText,
      item.copyText,
      item.note,
      normalizeColor(item.color)
    ].map(cell).join(','))
  ];
  const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=`copy-buttons-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('CSVをエクスポートしました');
};

function csv(text){
  text=text.replace(/^\uFEFF/,'');
  const rows=[];
  let row=[];
  let value='';
  let quoted=false;

  for(let index=0;index<text.length;index++){
    const character=text[index];
    if(quoted){
      if(character==='"'&&text[index+1]==='"'){
        value+='"';
        index++;
      }else if(character==='"'){
        quoted=false;
      }else{
        value+=character;
      }
    }else if(character==='"'){
      quoted=true;
    }else if(character===','){
      row.push(value);
      value='';
    }else if(character==='\n'){
      row.push(value.replace(/\r$/,''));
      rows.push(row);
      row=[];
      value='';
    }else{
      value+=character;
    }
  }

  if(quoted)throw Error('ダブルクォーテーションが閉じられていません。');
  if(value||row.length){
    row.push(value.replace(/\r$/,''));
    rows.push(row);
  }
  return rows.filter(cells=>cells.some(Boolean));
}

file.onchange=async()=>{
  const selected=file.files[0];
  file.value='';
  if(!selected)return;

  try{
    const rows=csv(await selected.text());
    const colorHeader=['order','category','display_text','copy_text','note','color'];
    const newHeader=['order','category','display_text','copy_text','note'];
    const oldHeader=['order','display_text','copy_text','note'];
    const hasColor=rows.length&&colorHeader.every((value,index)=>rows[0][index]===value);
    const isNew=rows.length&&newHeader.every((value,index)=>rows[0][index]===value);
    const isOld=rows.length&&oldHeader.every((value,index)=>rows[0][index]===value);

    if(!hasColor&&!isNew&&!isOld)throw Error('1行目の列名が正しくありません。');

    const next=rows.slice(1).map((row,index)=>{
      const expectedLength=hasColor?6:isNew?5:4;
      if(row.length!==expectedLength)throw Error(`${index+2}行目の列数が正しくありません。`);
      const displayIndex=hasColor||isNew?2:1;
      if(!row[displayIndex].trim())throw Error(`${index+2}行目の表示文字列が空です。`);
      return hasColor?{
        id:id(),
        category:normalizeCategory(row[1]),
        displayText:row[2],
        copyText:row[3],
        note:row[4],
        color:normalizeColor(row[5]),
        order:Number(row[0])
      }:isNew?{
        id:id(),
        category:normalizeCategory(row[1]),
        displayText:row[2],
        copyText:row[3],
        note:row[4],
        color:'',
        order:Number(row[0])
      }:{
        id:id(),
        category:'未分類',
        displayText:row[1],
        copyText:row[2],
        note:row[3],
        color:'',
        order:Number(row[0])
      };
    }).sort((a,b)=>(Number.isFinite(a.order)?a.order:999999)-(Number.isFinite(b.order)?b.order:999999))
      .map(({order,...item})=>item);

    const mode=prompt(`${next.length}件を読み込みました。\n「置換」または「追加」と入力してください。`,'置換');
    if(mode===null)return;
    if(!['置換','追加'].includes(mode))throw Error('「置換」または「追加」を入力してください。');
    items=mode==='置換'?next:[...items,...next];
    save();
    toast(`${next.length}件をインポートしました`);
  }catch(error){
    toast(error.message||'CSVを読み込めませんでした');
  }
};

render();
})();
