"""Lista as janelas X11 (via XWayland). --ativar=<texto> pede ao gerenciador para trazer a janela para a frente;
--mover=X,Y (com --ativar) antes a leva, maximizada, para o monitor que contém o ponto X,Y da área de trabalho."""
import ctypes, ctypes.util, sys
X = ctypes.cdll.LoadLibrary(ctypes.util.find_library('X11'))
X.XOpenDisplay.restype = ctypes.c_void_p
d = X.XOpenDisplay(None)
if not d: raise SystemExit('sem display')
X.XDefaultRootWindow.argtypes = [ctypes.c_void_p]; X.XDefaultRootWindow.restype = ctypes.c_ulong
root = X.XDefaultRootWindow(d)
class Attr(ctypes.Structure):
    _fields_ = [('x', ctypes.c_int), ('y', ctypes.c_int), ('width', ctypes.c_int), ('height', ctypes.c_int), ('border', ctypes.c_int), ('depth', ctypes.c_int),
                ('visual', ctypes.c_void_p), ('root', ctypes.c_ulong), ('cls', ctypes.c_int), ('bit_gravity', ctypes.c_int), ('win_gravity', ctypes.c_int),
                ('backing_store', ctypes.c_int), ('backing_planes', ctypes.c_ulong), ('backing_pixel', ctypes.c_ulong), ('save_under', ctypes.c_int),
                ('colormap', ctypes.c_ulong), ('map_installed', ctypes.c_int), ('map_state', ctypes.c_int), ('all_event_masks', ctypes.c_long),
                ('your_event_mask', ctypes.c_long), ('do_not_propagate_mask', ctypes.c_long), ('override_redirect', ctypes.c_int), ('screen', ctypes.c_void_p)]
def children(w):
    r = ctypes.c_ulong(); p = ctypes.c_ulong(); ch = ctypes.POINTER(ctypes.c_ulong)(); n = ctypes.c_uint()
    X.XQueryTree(ctypes.c_void_p(d), ctypes.c_ulong(w), ctypes.byref(r), ctypes.byref(p), ctypes.byref(ch), ctypes.byref(n))
    out = [ch[i] for i in range(n.value)]
    if n.value: X.XFree(ch)
    return out
def name(w):
    s = ctypes.c_char_p()
    X.XFetchName(ctypes.c_void_p(d), ctypes.c_ulong(w), ctypes.byref(s))
    return (s.value or b'').decode('utf8', 'replace')
def attr(w):
    a = Attr(); X.XGetWindowAttributes(ctypes.c_void_p(d), ctypes.c_ulong(w), ctypes.byref(a)); return a
found = []
def walk(w, depth=0):
    for c in children(w):
        nm = name(c); a = attr(c)
        if nm and a.width > 200:
            found.append((c, nm, a.map_state, a.x, a.y, a.width, a.height, a.override_redirect, depth))
        if depth < 2: walk(c, depth + 1)
walk(root)
for f in found: print('JANELA 0x%x | %s | mapeada=%s | %d,%d %dx%d | override=%d | nivel=%d' % (f[0], f[1][:50], {0: 'NAO', 1: 'oculta', 2: 'SIM'}[f[2]], f[3], f[4], f[5], f[6], f[7], f[8]))
want = next((x.split('=', 1)[1] for x in sys.argv if x.startswith('--ativar=')), None)
if want:
    tgt = next((f for f in found if want.lower() in f[1].lower()), None)
    if not tgt: raise SystemExit('janela não encontrada: ' + want)
    class ClientMessage(ctypes.Structure):
        _fields_ = [('type', ctypes.c_int), ('serial', ctypes.c_ulong), ('send_event', ctypes.c_int), ('display', ctypes.c_void_p), ('window', ctypes.c_ulong),
                    ('message_type', ctypes.c_ulong), ('format', ctypes.c_int), ('l', ctypes.c_long * 5)]
    class XEvent(ctypes.Union):
        _fields_ = [('xclient', ClientMessage), ('pad', ctypes.c_long * 24)]
    X.XInternAtom.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]; X.XInternAtom.restype = ctypes.c_ulong
    ev = XEvent(); ev.xclient.type = 33; ev.xclient.send_event = 1; ev.xclient.display = d; ev.xclient.window = tgt[0]
    ev.xclient.message_type = X.XInternAtom(d, b'_NET_ACTIVE_WINDOW', 0); ev.xclient.format = 32
    ev.xclient.l[0] = 2; ev.xclient.l[1] = 0; ev.xclient.l[2] = 0        # origem 2 = pedido do próprio usuário/painel
    def send(atom, *l):
        e = XEvent(); e.xclient.type = 33; e.xclient.send_event = 1; e.xclient.display = d; e.xclient.window = tgt[0]
        e.xclient.message_type = X.XInternAtom(d, atom, 0); e.xclient.format = 32
        for i, v in enumerate(l): e.xclient.l[i] = v
        X.XSendEvent(ctypes.c_void_p(d), ctypes.c_ulong(root), 0, ctypes.c_long((1 << 19) | (1 << 20)), ctypes.byref(e)); X.XFlush(ctypes.c_void_p(d))
    mv = next((x.split('=', 1)[1] for x in sys.argv if x.startswith('--mover=')), None)
    if mv:
        import time
        mx, my = [int(v) for v in mv.split(',')]
        H = X.XInternAtom(d, b'_NET_WM_STATE_MAXIMIZED_HORZ', 0); Vv = X.XInternAtom(d, b'_NET_WM_STATE_MAXIMIZED_VERT', 0)
        send(b'_NET_WM_STATE', 0, H, Vv, 2); time.sleep(0.5)                                  # tira o maximizado
        send(b'_NET_MOVERESIZE_WINDOW', (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11) | (2 << 12), mx, my, 1400, 800); time.sleep(0.5)
        send(b'_NET_WM_STATE', 1, H, Vv, 2); time.sleep(0.5)                                  # maximiza no monitor novo
    X.XSendEvent(ctypes.c_void_p(d), ctypes.c_ulong(root), 0, ctypes.c_long((1 << 19) | (1 << 20)), ctypes.byref(ev))
    X.XFlush(ctypes.c_void_p(d)); print('ATIVAR enviado para 0x%x (%s)' % (tgt[0], tgt[1][:40]))
