import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), raster: vi.fn() }));
vi.mock('../src/store/db', () => ({ getRender: mocks.get, putRender: mocks.put }));
vi.mock('../src/render/raster', () => ({ rasterize: mocks.raster }));

beforeEach(() => {
  vi.resetModules();
  mocks.get.mockReset().mockResolvedValue(undefined);
  mocks.put.mockReset().mockResolvedValue(undefined);
  mocks.raster.mockReset().mockResolvedValue(new Blob(['card']));
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:card');
});
describe('imagens das cartas', () => {
  it('biblioteca e mão compartilham o desenho da mesma carta em andamento', async () => {
    let release!: (blob: Blob) => void;
    mocks.raster.mockImplementation(() => new Promise<Blob>((r) => { release = r; }));
    const { requestImage } = await import('../src/render/queue');
    const first = requestImage('a', () => '<svg/>', 0);
    await vi.waitFor(() => expect(mocks.raster).toHaveBeenCalledOnce());
    const second = requestImage('a', () => '<svg/>', 10);
    expect(second).toBe(first);
    release(new Blob(['card']));
    expect(await second).toBe('blob:card');
    expect(mocks.raster).toHaveBeenCalledOnce();
  });
  it('uma falha no cache não impede a carta de aparecer', async () => {
    mocks.get.mockRejectedValue(new Error('cache indisponível'));
    mocks.put.mockRejectedValue(new Error('quota excedida'));
    const { requestImage, cachedUrl } = await import('../src/render/queue');
    expect(await requestImage('a', () => '<svg/>', 0)).toBe('blob:card');
    expect(cachedUrl('a')).toBe('blob:card');
  });
  it('um desenho que falha pode ser tentado novamente', async () => {
    mocks.raster.mockRejectedValueOnce(new Error('imagem inválida'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { requestImage } = await import('../src/render/queue');
    await expect(requestImage('a', () => '<svg/>', 0)).rejects.toThrow('imagem inválida');
    expect(await requestImage('a', () => '<svg/>', 0)).toBe('blob:card');
  });
});
