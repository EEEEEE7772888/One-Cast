"""Builds the One Cast world map images from Natural Earth (public domain) vector data.
Run: python3 tools/build-map.py /path/to/natural-earth-vector/geojson
Writes img/map-1024.png, img/map-2048.png, img/map-4096.png (pixel-art terrain, equirectangular)
and js/mapdata.js (city lights for the night side)."""
import json, sys, os, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ne/geojson'
OUT = os.path.join(os.path.dirname(__file__), '..')

def load(name):
    return json.load(open(os.path.join(SRC, name)))['features']

LAND = load('ne_50m_land.geojson')
LAKES = load('ne_50m_lakes.geojson')
RIVERS = load('ne_50m_rivers_lake_centerlines.geojson')
GLACIERS = load('ne_50m_glaciated_areas.geojson')
SHELVES = load('ne_50m_antarctic_ice_shelves_polys.geojson')
REGIONS = load('ne_50m_geography_regions_polys.geojson')
CITIES = load('ne_50m_populated_places_simple.geojson')

# Palette: index -> color. Kept small so the PNGs stay small.
PAL = [
    ('deep',    (22, 52, 104)),
    ('deep2',   (26, 60, 116)),
    ('mid',     (34, 78, 140)),
    ('mid2',    (38, 86, 150)),
    ('shelf',   (48, 112, 172)),
    ('shallow', (70, 146, 196)),
    ('foam',    (168, 214, 236)),
    ('lake',    (64, 136, 192)),
    ('river',   (70, 140, 196)),
    ('jungle',  (34, 104, 52)),
    ('jungle2', (28, 88, 44)),
    ('grass',   (86, 146, 66)),
    ('grass2',  (74, 132, 58)),
    ('forest',  (54, 112, 62)),
    ('forest2', (44, 98, 56)),
    ('boreal',  (52, 96, 72)),
    ('boreal2', (42, 84, 64)),
    ('dry',     (164, 156, 92)),
    ('dry2',    (148, 140, 82)),
    ('sand',    (218, 192, 124)),
    ('sand2',   (202, 174, 108)),
    ('tundra',  (138, 150, 120)),
    ('tundra2', (122, 136, 108)),
    ('mtn',     (128, 108, 84)),
    ('mtn2',    (104, 88, 70)),
    ('mtnhi',   (166, 148, 120)),
    ('snow',    (236, 242, 248)),
    ('snow2',   (206, 222, 236)),
    ('ice',     (184, 214, 232)),
    ('coast',   (16, 30, 56)),
]
IDX = {n: i for i, (n, _) in enumerate(PAL)}

def rings(geom):
    t = geom['type']
    if t == 'Polygon':
        yield geom['coordinates']
    elif t == 'MultiPolygon':
        for p in geom['coordinates']:
            yield p

def lines(geom):
    t = geom['type']
    if t == 'LineString':
        yield geom['coordinates']
    elif t == 'MultiLineString':
        for l in geom['coordinates']:
            yield l

def build(W):
    H = W // 2
    sx = W / 360.0
    sy = H / 180.0
    def xy(p):
        return ((p[0] + 180) * sx, (90 - p[1]) * sy)

    def mask(features, filt=None, width=0):
        im = Image.new('L', (W, H), 0)
        d = ImageDraw.Draw(im)
        for f in features:
            if filt and not filt(f['properties']):
                continue
            for poly in rings(f['geometry']):
                d.polygon([xy(p) for p in poly[0]], fill=255)
                for hole in poly[1:]:
                    d.polygon([xy(p) for p in hole], fill=0)
        return np.array(im) > 0

    land = mask(LAND)
    lakes = mask(LAKES, lambda p: (p.get('scalerank') or 0) <= (6 if W >= 4096 else 4 if W >= 2048 else 2))
    glaciers = mask(GLACIERS) | mask(SHELVES)
    def region(cls):
        return mask(REGIONS, lambda p: p.get('FEATURECLA') in cls)
    desert = region(('Desert',))
    mtn = region(('Range/mtn',))
    plateau = region(('Plateau',))
    tundra = region(('Tundra',))

    lat = 90 - (np.arange(H) + 0.5) / sy
    lon = (np.arange(W) + 0.5) / sx - 180
    LAT = np.repeat(lat[:, None], W, axis=1)
    LON = np.repeat(lon[None, :], H, axis=0)
    alat = np.abs(LAT)

    rng = np.random.default_rng(7)
    noise = rng.random((H, W))
    # blobby noise for natural texture
    blob = ndimage.gaussian_filter(rng.random((H, W)), sigma=max(1.0, W / 1400))
    blob = (blob - blob.min()) / (blob.max() - blob.min())

    out = np.full((H, W), IDX['mid'], dtype=np.uint8)
    # very large-scale noise warps the climate bands so they don't look like ruler lines
    big = ndimage.gaussian_filter(rng.random((H, W)), sigma=W / 90)
    big = (big - big.min()) / (big.max() - big.min())
    WL = alat + (big - 0.5) * 14 + (blob - 0.5) * 3

    # Ocean depth from distance to the coast.
    water = ~land
    dist = ndimage.distance_transform_edt(water) / sx  # in degrees
    dj = dist + (blob - 0.5) * 1.2
    out[water] = IDX['deep']
    out[water & (blob > 0.55)] = IDX['deep2']
    out[water & (dj < 4.5)] = IDX['mid']
    out[water & (dj < 4.5) & (blob > 0.58)] = IDX['mid2']
    out[water & (dj < 1.6)] = IDX['shelf']
    out[water & (dist < 0.45)] = IDX['shallow']
    # little wave marks in open ocean: short horizontal dashes
    wave = (noise < (0.010 if W < 2048 else 0.006)) & water & (dist > 3)
    wv = wave | np.roll(wave, 1, axis=1)
    out[wv & (out == IDX['deep'])] = IDX['mid']
    out[wv & (out == IDX['deep2'])] = IDX['mid']
    out[wv & (out == IDX['mid'])] = IDX['shelf']
    # polar sea ice with a ragged edge
    icelat = LAT + (big - 0.5) * 10 + (blob - 0.5) * 3
    seaice = water & ((icelat > 80) | (icelat < -69))
    out[seaice] = IDX['ice']
    out[seaice & (noise < 0.18)] = IDX['snow2']

    # Land: climate from warped latitude plus how far inland you are.
    L = land
    inland = ndimage.distance_transform_edt(land) / sx
    def put(m, a, b, p=0.5):
        out[m] = IDX[a]
        out[m & (blob > p)] = IDX[b]
    put(L, 'grass', 'grass2')
    put(L & (WL < 12), 'jungle', 'jungle2', 0.45)
    put(L & (WL >= 12) & (WL < 20), 'grass', 'dry', 0.66)
    put(L & (WL >= 40) & (WL < 52), 'forest', 'forest2')
    put(L & (WL >= 52) & (WL < 66), 'boreal', 'boreal2')
    put(L & (WL >= 66), 'tundra', 'tundra2')
    # dry interiors: subtropics far from the sea, and the steppes of central Asia
    dryness = ((WL > 16) & (WL < 36) & (inland + (blob - 0.5) * 3 > 4.5)) | ((WL >= 36) & (WL < 50) & (inland + (blob - 0.5) * 4 > 11))
    put(L & dryness, 'dry', 'dry2', 0.55)
    near_desert = ndimage.binary_dilation(desert, iterations=max(2, W // 400)) & L & ~desert & (blob > 0.35)
    put(near_desert, 'dry', 'dry2')
    put(desert & L & (WL < 50), 'sand', 'sand2', 0.55)
    # mountains: thin foothills at the edge, rocky cores, snowy peaks only on the big ranges
    mt = mtn & L
    md = ndimage.distance_transform_edt(mt) / sx
    foot = mt & (md < 0.7) & (blob > 0.45)
    out[foot] = IDX['mtn']
    core = mt & (md >= 0.7)
    put(core, 'mtn', 'mtn2', 0.5)
    hi = core & ~np.roll(np.roll(core, 1, axis=0), 1, axis=1)
    out[hi] = IDX['mtnhi']
    peaks = core & (md > 1.4) & (noise < 0.04)
    out[peaks] = IDX['snow2']
    out[peaks & (md > 2.2)] = IDX['snow']
    # snow and ice
    put((glaciers | (L & (LAT < -60))) & L, 'snow', 'snow2', 0.6)
    put(glaciers & ~L, 'ice', 'snow2', 0.6)

    # lakes and rivers
    out[lakes & L] = IDX['lake']
    if W >= 2048:
        im = Image.fromarray(out)
        d = ImageDraw.Draw(im)
        maxrank = 5 if W >= 4096 else 3
        for f in RIVERS:
            if (f['properties'].get('scalerank') or 9) > maxrank:
                continue
            for ln in lines(f['geometry']):
                d.line([xy(p) for p in ln], fill=IDX['river'], width=1)
        out = np.array(im)
        out[~L & (out == IDX['river'])] = IDX['shallow']

    # dark coastline outline on the water side and a light foam line
    edge = water & ndimage.binary_dilation(L, iterations=1)
    out[edge & ~seaice] = IDX['foam'] if W >= 2048 else IDX['shallow']
    lake_edge = L & ~lakes & ndimage.binary_dilation(lakes & L, iterations=1)
    out[lake_edge & (noise < 0.6)] = IDX['grass2']

    img = Image.fromarray(out, 'P')
    flat = []
    for _, c in PAL:
        flat.extend(c)
    img.putpalette(flat + [0] * (768 - len(flat)))
    return img

os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
for W in (1024, 2048, 4096):
    im = build(W)
    p = os.path.join(OUT, 'img', 'map-%d.png' % W)
    im.save(p, optimize=True)
    print(p, os.path.getsize(p) // 1024, 'KB')

# City lights: the biggest cities, for the night side.
cities = sorted(CITIES, key=lambda f: -(f['properties'].get('pop_max') or 0))[:700]
pts = []
for f in cities:
    p = f['properties']
    pop = p.get('pop_max') or 0
    rank = 3 if pop > 5e6 else 2 if pop > 1e6 else 1
    pts.append([round(p['longitude'], 2), round(p['latitude'], 2), rank])
with open(os.path.join(OUT, 'js', 'mapdata.js'), 'w') as fh:
    fh.write('/* City lights for the night side of the world map. Natural Earth populated places (public domain). [lon, lat, size] */\n')
    fh.write('window.MAP_LIGHTS=' + json.dumps(pts, separators=(',', ':')) + ';\n')
print('lights', len(pts))
