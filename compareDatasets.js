// v1.9.0

const settingsEl = document.querySelector('#settings');
const settingButtons = settingsEl.querySelectorAll('button');
const inputCount = settingsEl.querySelector('.input_qty');
const referenceCount = settingsEl.querySelector('.reference_qty');
const inputGroup = document.querySelector('#inputs');
const referenceGroup = document.querySelector('#references');
const submitButton = document.querySelector('#submit button');
const clearButton = document.querySelector('#clear-results button');
const matchesEl = document.querySelector('#matches');
const commonsEl = document.querySelector('#commons');

let inputs;
let references;

const data = {
  inputs: [],
  references: [],
  matches: [],
  commonFinds: []
};


// TODO api: https://rest.ensembl.org/xrefs/id/ENSG00000225510?content-type=application/json
// https://rest.ensembl.org/xrefs/id/ENSG00000153310?external_db=HGNC;content-type=application/json
// https://rest.ensembl.org/documentation/info/xref_id
// grab result from dbname: "HGNC", grab property "display_id"
// TODO improve copy function

function resetData() {
  data.inputs = [];
  data.references = [];
  data.matches = [];
  data.commonFinds = [];
}

function setLists(e, options) {
  let action;
  let type;
  if(!options){
    action = this.dataset.action
    type = this.dataset.type
  } else {
    action = options.action;
    type = options.type;
  }
  action === 'add' ? addList(type) : removeList(type);
  inputCount.textContent = inputs.length;
  referenceCount.textContent = references.length;
}

function updateLists() {
  inputs = document.querySelectorAll('#inputs .list');
  references = document.querySelectorAll('#references .list');
}

function addList(type) {
  const group = type === 'input' ? inputGroup : referenceGroup;
  const html = `<input data-type="title" type="text" placeholder="TITLE">
    <textarea name="list" placeholder="gene list separated by line break"></textarea>
    <input data-type="values" type="text" placeholder="COUNT" value="" tabindex="-1" readonly>
    <button data-type="clear" tabindex="-1">clear</button>`;
  const newList = document.createElement('div');
  newList.classList.add("list");
  newList.dataset.type = type;
  newList.innerHTML = html;
  group.appendChild(newList);
  newList.addEventListener('keyup', handleInput);
  newList.addEventListener('click', handleInput);
  newList.firstElementChild.focus();
  updateLists();
}

function removeList(type) {
  const group = type === 'input' ? inputGroup : referenceGroup;
  if(group.children.length > 1){
    group.lastChild.remove();
  };
  group.lastChild.firstElementChild.focus();
  updateLists();
}

function copyToClipboard(str) {
  const el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function handleShortcuts(e) {
  if(e.key === 'Enter' && e.ctrlKey) {
    handleSubmit();
  }
  if(e.key.includes('Arrow') && e.ctrlKey && e.target.parentElement.classList[0] === 'list' ) {
    const type = e.target.parentElement.dataset.type;
    if(e.key === 'ArrowDown') {
      setLists(null, {action: 'add', type: type});
    }
    if(e.key === 'ArrowUp') {
      setLists(null, {action: 'remove', type: type});
    }
  }
}

function copyResult(element, parent, targetType) {
  const title = element.querySelector('.result-title').textContent;
  const list = element.querySelector('.result-list').textContent;
  const count = element.querySelector('[data-type="values"]').value;
  let clipboard;
  if(targetType === 'result') {
    if(parent === 'matches') {
      clipboard = `${title}\n${count}\n${list.split(',').join(`\n`)}`;
    };
    if(parent === 'commons') {
      clipboard = list.split(`\n`).map(item => `${title},${item}`).join(`\n`);
    };
  }
  if(targetType === 'result-all') {
    if(parent === 'matches') {
      clipboard = list.split(`\n`).map(item => `${title},${count},${item}`).join(`\n`);
    };
    if(parent === 'commons') {
      clipboard = list.split(`\n`).map(item => `${title},${item}`).join(`\n`);
    };
  }
  return clipboard;
}


function handleInput(e) {
  const parent = e.currentTarget.parentElement.id;
  const targetType = e.target.dataset.type;
  if(parent === 'inputs' || parent === 'references') {
    const title = e.currentTarget.querySelector('[data-type="title"]');
    const list = e.currentTarget.querySelector('textarea');
    const listLength = removeDuplicates(list.value.split(/\r?\n/g).map(item => item.toLowerCase()).map(item => item.replace(/\s/g, '')).filter(item => !!item)).length;
    const count = e.currentTarget.querySelector('[data-type="values"]');
    list.value ? count.value = listLength : count.value = "";
    if(e.target.dataset.type === 'clear' && e.type === 'click') {
      title.value = '';
      list.value = '';
      count.value = '';
    }
  }
  
  if(parent === 'matches' || parent === 'commons') {
    if(targetType === 'result') {
      clipboard = copyResult(e.currentTarget, parent, targetType);
      copyToClipboard(clipboard);
    }
    if(targetType === 'result-all') {
      const allMatches = document.querySelectorAll(`#${parent} .result`);
      const clipboard = [];
      allMatches.forEach(match => clipboard.push(copyResult(match, parent, targetType)));
      copyToClipboard(clipboard.join(`\n`));
    }
  }
}

function setDataFromInputs(element) {
  element.querySelectorAll('.list').forEach(input => {
    const title = input.querySelector('[data-type="title"]').value;
    const listText = input.querySelector('textarea').value;
    const listArray = removeDuplicates(listText.split(/\r?\n/g).map(item => item.replace(/\s/g, '')).filter(item => !!item));
    if(title && listText) {
      const obj = {
        title: title,
        list: listArray
      };
      data[element.id].push(obj);
    }
  });
}

function checkDuplicateTitles() {
  const titles = [...document.querySelectorAll('[data-type="title"]')].filter(item => !!item.value).map(el => el.value.toLowerCase());
  return titles.some((item, i, arr) => arr.indexOf(item) !== i);
}

function removeDuplicates(arr) {
  return [...new Set(arr)];
}

function findMatches() {
  data.inputs.forEach(({title: inputTitle, list: inputList}) => {
    data.references.forEach(({title: referenceTitle, list: referenceList}) => {
      const newMatch = {};
      newMatch.title = [inputTitle, referenceTitle];
      newMatch.list = referenceList.filter(referenceItem => {
        return inputList.some(inputItem => inputItem.toLowerCase() === referenceItem.toLowerCase());
      }).sort((a,b) => {
        return inputList.indexOf(a) - inputList.indexOf(b);
      });
      data.matches.push(newMatch);
    });
  });
}

function findCommonFinds() {
  data.inputs.forEach(({title: inputTitle, list: inputList}) => {
    const newCommon = {title: inputTitle}
    const commonList = {};
    inputList.forEach(inputItem => {
      const itemSearch = []
      data.references.forEach(({title: referenceTitle, list: referenceList}) => {
        if(referenceList.some(referenceItem => referenceItem.toLowerCase() === inputItem.toLowerCase())) {
          itemSearch.push(referenceTitle);
        };
      });
      if(itemSearch.length > 1) {
        commonList[inputItem] = itemSearch;
      };
      if(Object.keys(commonList).length) {
        newCommon.list = commonList;
      };
    });
    if(newCommon.list){
      data.commonFinds.push(newCommon);
    }
  });
}

function populateResults() {
  data.matches.forEach(({title: matchTitle, list: matchList}) => {
    const totalNum = data.inputs.find(ref => ref.title === matchTitle[0]).list.length;
    const newResult = document.createElement('div');
    newResult.classList.add('result');
    const resultHTML = `<p class="result-title"><strong>${matchTitle[0]}</strong><span>&nbspin&nbsp</span><strong>${matchTitle[1]}</strong></p><textarea class="result-list" name="list">${matchList}</textarea><input data-type="values" type="text" value="${matchList.length} of ${totalNum}" readonly><button data-type="result">COPY</button>`;
    newResult.innerHTML = resultHTML;
    matchesEl.appendChild(newResult);
    newResult.addEventListener('click', handleInput);
  });

  data.commonFinds.forEach(({title: commonTitle, list: commonList}) => {
    const newResult = document.createElement('div');
    newResult.classList.add('result');
    let listHTML = [];
    Object.entries(commonList).forEach(([listTitle, list]) => {
      const listLine = `<p><strong>${listTitle}</strong>,${list.join(',')}</p>`;
      listHTML.push(listLine);
    })
    const resultHTML = `<p class="result-title">common finds in <strong>${commonTitle}</strong></p><div class="result-list">${listHTML.join(`\n`)}</div><input data-type="values" type="text" value="${listHTML.length}" readonly><button data-type="result">COPY</button>`;
    newResult.innerHTML = resultHTML;
    commonsEl.appendChild(newResult);
    newResult.addEventListener('click', handleInput);
  });

  [matchesEl, commonsEl].forEach(el => {
    if(el.children.length) {
      const newDiv = document.createElement('div');
      newDiv.classList.add('copy-results');
      const copyButton =`<button data-type="result-all">Copy all</button>`
      newDiv.innerHTML = copyButton;
      newDiv.addEventListener('click', handleInput)
      el.appendChild(newDiv);
    }
  })
}

function handleSubmit() {
  if(checkDuplicateTitles()){
    alert('You have two datasets with the same title');
    return;
  }
  resetData();
  
  setDataFromInputs(inputGroup);
  setDataFromInputs(referenceGroup);

  findMatches();
  findCommonFinds();

  resetResults();
  populateResults();

  matchesEl.scrollIntoView({behavior: 'smooth'});
}

function resetResults() {
  const resultsList = document.querySelectorAll('#results .result, .copy-results');
  resultsList.forEach(item => {
    item.removeEventListener('click', handleInput);
    item.remove();
  })
}


settingButtons.forEach(button => button.addEventListener('click', setLists));
submitButton.addEventListener('click', handleSubmit);
clearButton.addEventListener('click', resetResults);
window.addEventListener('keydown', handleShortcuts);

addList('input');
addList('reference');