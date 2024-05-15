const fileInput = document.getElementById('fileInput');
const loadButton = document.getElementById('loadButton');
const saveButton = document.getElementById('saveButton');
const workbookContainer = document.getElementById('workbookContainer');

let workbook;

loadButton.addEventListener('click', () => {
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const data = new Uint8Array(event.target.result);
    workbook = XLSX.read(data, { type: 'array' });
    renderWorkbook();
  };
  reader.readAsArrayBuffer(file);
});

saveButton.addEventListener('click', () => {
  XLSX.writeFile(workbook, 'workbook.xlsx');
});

function renderWorkbook() {
  workbookContainer.innerHTML = '';
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    const headerCell = document.createElement('th');
    headerCell.textContent = sheetName;
    headerRow.appendChild(headerCell);
    table.appendChild(headerRow);
    for (const key in sheet) {
      if (key[0] === '!') continue;
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = sheet[key].v;
      row.appendChild(cell);
      table.appendChild(row);
    }
    workbookContainer.appendChild(table);
  });
  saveButton.disabled = false;
}