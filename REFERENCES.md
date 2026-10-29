# เอกสารอ้างอิง

ตรวจและใช้อ้างอิงวันที่ 29 ตุลาคม 2026

## Dataset และความหมายข้อมูล

- [Hotel Booking Demand — Jesse Mostipak / Kaggle](https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand): Dataset ที่ใช้จริง ดาวน์โหลดจาก public API ของ Dataset เดียวกัน
- [Antonio, N., Almeida, A., & Nunes, L. (2019). Hotel booking demand datasets. Data in Brief, 22, 41–49.](https://doi.org/10.1016/j.dib.2018.11.126): บทความต้นทาง
- [บทความฉบับ PMC และนิยามตัวแปร](https://pmc.ncbi.nlm.nih.gov/articles/PMC6297060/): URL ต้นทางที่ผู้ใช้กำหนด การอ่านอัตโนมัติรอบนี้ติด browser challenge จึงใช้ schema จริง/ข้อกำหนดที่ให้และไม่เพิ่มสมมติฐานสกุลเงินหรือชื่อรหัสห้อง

## Web และการอ่านเขียนข้อมูล

- [Vite Guide](https://vite.dev/guide/): React/TypeScript dev/build และ Node requirements
- [Express Installing](https://expressjs.com/en/starter/installing/): Express5 และ TypeScript
- [ExcelJS README](https://github.com/exceljs/exceljs): streaming workbook reader/writer ไม่ใช่เครื่องคำนวณ Power Query/Goal Seek
- [csv-parse options](https://csv.js.org/parse/options/): BOM, columns และ quoted fields/newlines
- [Node.js fs](https://nodejs.org/api/fs.html): exclusive file open, rename, fsync และการจัดการไฟล์

## Excel

- [Excel Queries.Add](https://learn.microsoft.com/en-us/office/vba/api/excel.queries.add): เพิ่ม native WorkbookQuery จาก M
- [WorkbookConnection และ Connections](https://learn.microsoft.com/en-us/office/vba/api/excel.workbook.connections): connection ใน workbook
- [QueryTable.Refresh](https://learn.microsoft.com/en-us/office/vba/api/excel.querytable.refresh): Refresh แบบรอผล
- [CalculateUntilAsyncQueriesDone](https://learn.microsoft.com/en-us/office/vba/api/excel.application.calculateuntilasyncqueriesdone): รอ asynchronous query
- [Range.GoalSeek](https://learn.microsoft.com/en-us/office/vba/api/excel.range.goalseek): Goal Seek บน Excel จริง
- [FORECAST.LINEAR](https://support.microsoft.com/en-us/office/forecast-and-forecast-linear-functions-50ca49c9-7b40-4892-94e4-7ad38bbeda99): baseline linear forecast
- [Why does my query run multiple times?](https://learn.microsoft.com/en-us/power-query/multiple-queries): การประเมิน query ที่อ้างอิงกัน และเหตุผลที่ต้องลดการคลีนซ้ำในการ Refresh

## Tableau

- [Tableau Embedding API v3 basics](https://help.tableau.com/current/api/embedding_api/en-us/docs/embedding_api_basic.html): ฝัง Tableau Public viz จริง
- [Embedding events](https://help.tableau.com/current/api/embedding_api/en-us/docs/embedding_api_event.html): โหลดสำเร็จ/ล้มเหลว
- [Tableau Public FAQ](https://help.tableau.com/current/pro/desktop/en-us/public_faq.htm): การเผยแพร่และข้อจำกัดการ Refresh
- [FIXED LOD expressions](https://help.tableau.com/current/pro/desktop/en-us/calculations_calculatedfields_lod_fixed.htm): ระดับโรงแรมและการจัด scope/filter
- [Tableau order of operations](https://help.tableau.com/current/pro/desktop/en-us/order_of_operations.htm): context filters กับ FIXED LOD
- [Tableau Desktop editions](https://help.tableau.com/current/pro/desktop/en-us/desktop_comparison.htm): แยก Desktop Free Edition ที่พบในเครื่องกับ Desktop Public Edition ที่ใช้เผยแพร่ Public

ไม่มีการอ้างว่าข้อมูลปี2015–2017สะท้อนสถานการณ์ปัจจุบัน ไม่มีแหล่งข้อมูลอื่นมาผสม Dataset
