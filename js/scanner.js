// Leitor de código de barras pela câmera (ZXing) e por leitor USB/Bluetooth.
const Scanner = {
  reader: null,
  busy: false,

  onDetected(text) {
    if (this.busy) return;
    this.busy = true;
    if (navigator.vibrate) navigator.vibrate(100);
    Stock.process(text);
    setTimeout(() => this.stop(), 500);
  },

  async start() {
    if (!Auth.user) return;
    this.busy = false;
    $('cameraModal').classList.remove('hidden');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      UI.toast('A câmera precisa de HTTPS para funcionar no celular.', 'error');
      this.stop();
      return;
    }

    try {
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.QR_CODE
      ]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

      this.reader = new ZXing.BrowserMultiFormatReader(hints, 250);
      await this.reader.decodeFromConstraints(
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        'videoScanner',
        (result) => { if (result && result.text) this.onDetected(result.text); }
      );
    } catch (e) {
      console.error('Erro na câmera:', e);
      UI.toast('Não foi possível abrir a câmera. Verifique as permissões do navegador.', 'error');
      this.stop();
    }
  },

  stop() {
    if (this.reader) { this.reader.reset(); this.reader = null; }
    const video = $('videoScanner');
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    $('cameraModal').classList.add('hidden');
  },

  // Leitor físico: digita o código e envia "Enter".
  onKey(event) {
    if (event.key !== 'Enter') return;
    const input = $('barcodeInput');
    Stock.process(input.value);
    input.value = '';
  }
};
