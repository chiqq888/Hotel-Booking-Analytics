# สถานะการตรวจ Tableau บนเครื่องนี้

ตรวจผ่านหน้าจอจริงวันที่ 29 ตุลาคม 2026:

- พบ Tableau Desktop 2026.2 เปิดใช้งานได้ และมีตัวเชื่อมต่อ Microsoft Excel
- หน้าเริ่มต้นระบุ **Tableau Desktop Free Edition** และแจ้งว่า Free Edition ไม่สามารถแชร์แอสเซ็ตกับผู้ใช้อื่นได้ รุ่นนี้ต่างจาก Tableau Desktop Public Edition ตามขอบเขตงาน
- หน้าเริ่มต้นแจ้งให้ใช้ 2026.2.1 หรือใหม่กว่าหลัง 31 สิงหาคม 2026 และมีหน้าต่างเสนออัปเดต โปรแกรมยังเปิดหน้าต่างเลือกไฟล์ Excel ได้จริง
- ปิดเฉพาะข้อความเตือนอัปเดตและหน้าต่างรายการกู้คืนไฟล์เดิม โดยไม่ได้ลบ เปิด หรือเขียนทับเวิร์กบุ๊กเดิมของผู้ใช้
- ไม่ได้ติดตั้งอัปเดต เปลี่ยนสิทธิ์ใช้งาน เข้าสู่บัญชี หรือเผยแพร่ข้อมูลไปยัง Tableau Public
- เปิดทดสอบตัวเชื่อม Microsoft Excel แล้วปิดเฉพาะ file selector ที่เปิดในการตรวจครั้งนี้ กลับหน้าเริ่มต้นของ Tableau โดยไม่ได้เชื่อม workbook ที่ยังสร้างไม่เสร็จ
- ยังไม่ได้สร้าง `.twb/.twbx`, Dashboard, Story หรือเทียบ metric ระหว่าง Tableau กับ Excel จริง งานส่วนนี้ใช้คู่มือที่เตรียมไว้เป็นทางเลือกตามข้อจำกัดของ Edition

การมี Tableau Desktop Free Edition ในเครื่องยังไม่เท่ากับมี Dashboard ที่เผยแพร่บน Tableau Public ให้ทำตาม [BUILD_GUIDE.md](BUILD_GUIDE.md) ด้วย Desktop Public Edition/สิทธิ์ที่เผยแพร่ Public ได้ แล้วใส่ URL ผลงานจริงใน `VITE_TABLEAU_VIZ_URL` เท่านั้น

เอกสารทางการ [เปรียบเทียบ Tableau Desktop Editions](https://help.tableau.com/current/pro/desktop/en-us/desktop_comparison.htm) ยืนยันว่า Free Edition บันทึกงานในเครื่องได้ แต่เผยแพร่ไป Tableau Public ไม่ได้ ส่วน [Free Edition FAQ](https://help.salesforce.com/s/articleView?id=005316652&language=en_US&type=1) ระบุข้อจำกัดการแชร์ไฟล์ `.twb` กับผู้ใช้อื่นด้วย ดังนั้นงานส่งอาจารย์/เผยแพร่ควรสร้างใน Public Edition ตามคู่มือที่เตรียมไว้ ไม่ถือไฟล์ local จาก Free Edition เป็นผลงาน Public ที่ส่งมอบเสร็จ

ดาวน์โหลดรุ่นที่ตรงขอบเขตจาก [Tableau Desktop Public Edition ทางการ](https://www.tableau.com/products/public/download) การอัปเดต Desktop Free อย่างเดียวไม่ได้เปลี่ยนเป็น Public Edition

สถานะ workbook ของงานนี้ให้ดู `CHECKLIST.md` ที่ root และไฟล์ `.twb/.twbx` ที่มีอยู่จริง ไม่มีการสร้างไฟล์ XML/เปลี่ยนนามสกุลเพื่ออ้างว่า Tableau สร้างงานแล้ว
