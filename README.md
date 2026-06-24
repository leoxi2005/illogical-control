# Illogical Control

App desktop (Electron) gom **2 mini-game / visual realtime** của Illogical Playground Day 2 và phát **NDI Out** để TouchDesigner nhận trực tiếp — không cần OBS, không cần `Web Render TOP`, không cần gõ `file://`.

| Scene | NDI Source Name | Resolution | Phím tắt |
|---|---|---|---|
| **Floor Spots** | `IllogicalFloor` | 3305 × 2561 | `→`/`Space` next · `←` prev · `A` bật hết · `R` reset · `1`–`9` nhảy spot |
| **Bomb Timer** | `IllogicalTimer` | 8324 × 815 | `Space` start/pause · `R` reset · `O` reveal "OPEN IT" |

Chỉ scene đang **active** (đang xem ở sidebar) mới nhận phím — tránh đụng `R`/`Space` giữa 2 scene.

---

## 1. Yêu cầu hệ thống

- **macOS** (Apple Silicon hỗ trợ tốt) hoặc Windows.
- ✅ **KHÔNG cần cài NDI Tools / NDI Runtime.** Thư viện NDI (`libndi.dylib` trên Mac, `Processing.NDI.Lib.x64.dll` trên Windows) được **nhúng thẳng vào app** lúc build — app tự phát NDI được. (TouchDesigner đã có sẵn NDI để nhận.)
- **Node.js 18+** (arm64 trên Apple Silicon) và npm — chỉ cần khi **build từ source**. Dùng file `.app`/`.exe` đã build thì không cần gì.
- Để build từ source: Xcode Command Line Tools (macOS) hoặc Build Tools/Python (Windows) để compile native addon:
  ```bash
  xcode-select --install   # macOS
  ```

> NDI binding dùng là **`@stagetimerio/grandiose`** — addon **N-API**, biên dịch một lần chạy được cả Node lẫn Electron (không cần `electron-rebuild`). Lúc cài, nó **tự tải NDI SDK** và copy thư viện NDI nằm cạnh addon → khi đóng gói (`asarUnpack`) thư viện đi kèm app, nên máy đích không phải cài NDI Tools.

## 2. Cài đặt

```bash
cd /Users/macos/illogical-control
npm install
```

> ⚠️ **Đường dẫn KHÔNG được có dấu cách.** `node-gyp` (compile native addon NDI) sẽ fail nếu path chứa space — nên project đặt ở `/Users/macos/illogical-control` chứ không nằm trong `Documents/Bali Project/` (có dấu cách). Nó vẫn là app cho Bali project, chỉ là nơi build phải không-space. Muốn dời thì chọn path không dấu cách.

Lúc cài, package NDI sẽ **tự tải NDI SDK** và **compile native addon** (`node-gyp rebuild`). Cần mạng + Xcode CLT. Nếu fail, xem mục [Troubleshooting](#5-troubleshooting).

> Nếu `npm start` báo *"Electron failed to install correctly"*: binary Electron tải dở. Sửa nhanh:
> ```bash
> node node_modules/electron/install.js
> ```
> (đã xử lý sẵn ở máy này; chỉ cần khi cài lại từ đầu mà gặp lỗi đó.)

## 3. Chạy

```bash
npm start
```

Cửa sổ app mở ra:

- **Sidebar trái**: chọn scene (`Floor Spots` / `Bomb Timer`), mỗi scene có nút **Start/Stop NDI** + đèn trạng thái; có **Start All / Stop All**; chọn **FPS** (30 mặc định / 60).
- **Khu giữa**: preview scene đang chọn + dòng status (fps, NDI ready, đang stream gì).
- **Panel dưới**: toàn bộ controls của scene (port nguyên từ file HTML gốc).

### Cách dùng nhanh
1. Chọn scene → chỉnh controls cho vừa ý.
2. Bấm **Start NDI** ở scene đó (đèn xanh = đang phát).
3. Mở TouchDesigner → `NDI In TOP` → chọn Source Name `IllogicalFloor` hoặc `IllogicalTimer`.
4. Điều khiển bằng phím tắt (scene phải đang active) hoặc bằng các nút trong panel — TD sẽ thấy đổi realtime.

> **Lưu ý tải:** phát đồng thời 2 stream lớn (đặc biệt 8324×815) khá nặng vì mỗi frame phải đọc pixel + convert RGBA→BGRA. Mặc định bạn nên chỉ bật stream nào đang dùng. Nếu giật, hạ FPS về 30 và chỉ Start NDI scene cần thiết.

## 4. Build app cài đặt

### macOS (.app / .dmg) — build trên máy Mac
```bash
npm run build:mac   # tạo .dmg + .zip + .app
```
Kết quả nằm trong `release/`:
- `Illogical Control-1.0.0-arm64.dmg` — mở để kéo app vào Applications.
- `release/mac-arm64/Illogical Control.app` — chạy trực tiếp.

> **Gatekeeper:** app **chưa ký Apple Developer** nên lần đầu mở macOS sẽ chặn ("unidentified developer"). Cách mở:
> - Chuột phải vào app → **Open** → **Open** (chỉ cần 1 lần), hoặc
> - Terminal: `xattr -dr com.apple.quarantine "/đường/dẫn/Illogical Control.app"`

### Windows (.exe) — ⚠️ BẮT BUỘC build TRÊN máy Windows
Native addon NDI phải compile riêng cho từng OS — **không thể cross-build từ Mac sang Windows**. Khi qua máy Windows:
1. Cài Node.js (LTS). *(KHÔNG cần cài NDI Tools — driver NDI được nhúng vào .exe lúc build.)*
2. Copy **source** sang (KHÔNG copy `node_modules` của Mac). Tránh đường dẫn có dấu cách.
3. Trong thư mục project:
   ```bash
   npm install        # tải NDI SDK cho Windows + compile addon
   npm run build:win  # tạo .exe (NSIS installer) trong release\
   ```

> Tóm lại: file `.app`/`.dmg` này chỉ dùng trên Mac. Muốn file `.exe` thì lặp lại `npm install` + `npm run build:win` ngay trên máy Windows.

## 5. Troubleshooting

### NDI báo "unavailable" / không thấy source trong TD
- Status app ghi `NDI unavailable` nghĩa là addon NDI chưa load được. Visual vẫn render + preview bình thường, chỉ là không phát NDI.
- Cài lại từ đầu (tải lại NDI SDK + compile):
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- Là N-API nên thường KHÔNG cần `electron-rebuild`. Chỉ khi vẫn lỗi load trong Electron mới thử:
  ```bash
  npx electron-rebuild -f -w @stagetimerio/grandiose
  ```
- Thư viện NDI **đã nhúng sẵn** trong app (không cần NDI Tools). Nếu báo thiếu lib: build lại cho đúng OS đang chạy (`npm install` + `npm run build:mac`/`build:win` trên chính máy đó), và đảm bảo path không có dấu cách.

### Build fail trên Apple Silicon
- Cài Xcode CLT (`xcode-select --install`).
- Kiểm tra Node arm64 (không phải Node x64 qua Rosetta): `node -p process.arch` phải ra `arm64`.
- Nếu `node-gyp` lỗi Python: cần Python 3 trong PATH.

### TouchDesigner không thấy source
- 2 máy phải cùng mạng/localhost; NDI discovery đôi khi cần tắt firewall hoặc bật NDI Discovery Service.
- Trên cùng 1 máy: source vẫn hiện trong `NDI In TOP` (chọn theo tên).

## 6. Cấu trúc dự án

```
illogical-control/
  package.json
  main.js                 # Electron main: window + khởi tạo/giữ NDI senders, nhận frame qua IPC
  preload.js              # bridge an toàn: window.ndi.{available,start,stop,status,sendFrame}
  ndi/
    sender.js             # wrap grandiose: nhiều sender theo {name,w,h,fps}, RGBA→BGRA, send video
  renderer/
    index.html            # shell: sidebar + preview + panel
    app.js                # scene active, output set, render/send loop, route phím
    ui/controls.js        # build panel controls từ schema của scene
    scenes/
      floor-spots.js      # port 1:1 từ floor-spots.html (render + state + controls + phím)
      bomb-timer.js       # port 1:1 từ bomb-timer.html (render + state + controls + phím)
  README.md
```

## 7. Luồng dữ liệu

```
[Scene canvas full-res] --getImageData RGBA mỗi frame--> IPC --> [main: RGBA→BGRA] --> [grandiose sender theo tên]
        ▲ keyboard/panel điều khiển state
TouchDesigner: NDI In TOP (IllogicalFloor) -> map sàn
               NDI In TOP (IllogicalTimer) -> map tường
```

## 8. Thêm scene mới (mở rộng sau)

Kiến trúc scene mở. Để thêm visual mới:
1. Tạo `renderer/scenes/<ten>.js` export một factory trả về object có:
   `{ id, label, ndiName, canvas, ctx, params, stats, setRes, render(now), handleKey(e), onParamChange(id), actions[], controls[] }`.
2. Import + thêm vào mảng `scenes` trong `renderer/app.js`.
   NDI sender tự tạo theo `ndiName` + resolution khi bấm Start NDI. Không cần sửa main/sender.

## 9. Ghi chú kỹ thuật

- Mỗi scene render vào **canvas đúng resolution của nó**; mỗi frame `getImageData` (RGBA, gốc trên-trái) → gửi sang main → swap R/B thành **BGRA** → `sender.video(...)`.
- Có **back-pressure**: nếu frame trước chưa gửi xong thì frame mới bị bỏ (đếm `dropped`) để không dồn bộ nhớ.
- Buffer lớn: 8324×815 RGBA ≈ 27MB/frame, 3305×2561 ≈ 34MB/frame → ưu tiên **30fps**.
- Nền **đen tuyệt đối** để TD comp `Add/Screen` nếu cần (Bomb Timer); Floor Spots ra nguyên khung.
- (Ngoài phạm vi, để sau) OSC/MIDI trigger, các visual khác — kiến trúc đã chừa chỗ ở mục 8.
