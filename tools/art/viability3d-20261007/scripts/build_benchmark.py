import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
graph = {}

def add(node_id, node_type, **inputs):
    graph[str(node_id)] = {'class_type': node_type, 'inputs': inputs}

def ref(node_id, output=0):
    return [str(node_id), output]

add(1, 'LoadImage', image='brunhild-reference-v2.png')
add(2, 'LoadBackgroundRemovalModel', bg_removal_name='birefnet.safetensors')
add(3, 'RemoveBackground', bg_removal_model=ref(2), image=ref(1))
add(4, 'ImageCropToMask', images=ref(1), masks=ref(3), width=1024, height=1024, pad_factor=1.1, grow_mask=0, background='#000000')
add(5, 'SaveImage', images=ref(4), filename_prefix='preprocess/brunhild-input')
(root/'reports/preprocess-api.json').write_text(json.dumps(graph, indent=2)+'\n')

add(6, 'LoadMoGeModel', model_name='moge_2_vitl_normal_fp16.safetensors')
add(7, 'MoGeInference', moge_model=ref(6), image=ref(4), resolution_level=3, fov_x_degrees=0.0, batch_size=1, force_projection=True, apply_mask=True, refine_steps=0)
add(8, 'MoGeGeometryToFOV', moge_geometry=ref(7), axis='horizontal', unit='degrees')
add(9, 'CLIPVisionLoader', clip_name='dino_v3_L_naf_fp32.safetensors')
add(10, 'Pixal3DConditioning', clip_vision_model=ref(9), image=ref(4), camera_angle_x=ref(8))
add(11, 'UNETLoader', unet_name='pixal3d_int8_convrot.safetensors', weight_dtype='default')
add(12, 'CFGOverride', model=ref(11), cfg=1.0, start_percent=0.667, end_percent=1.0)
add(13, 'RescaleCFG', model=ref(12), multiplier=0.7)
add(14, 'ModelSamplingSD3', model=ref(13), shift=5.0)
add(15, 'EmptyTrellis2LatentStructure', batch_size=1)
add(16, 'KSampler', model=ref(14), positive=ref(10), negative=ref(10,1), latent_image=ref(15), seed=56, steps=12, cfg=7.5, sampler_name='euler', scheduler='normal', denoise=1.0)
add(17, 'VAELoader', vae_name='trellis_2_shape_vae_bf16.safetensors')
add(18, 'VaeDecodeStructureTrellis2', samples=ref(16), vae=ref(17), resolution='32')
add(19, 'Trellis2ShapeStage', positive=ref(10), negative=ref(10,1), voxel=ref(18))
add(20, 'CFGOverride', model=ref(11), cfg=1.0, start_percent=0.769, end_percent=1.0)
add(21, 'RescaleCFG', model=ref(20), multiplier=0.5)
add(22, 'KSampler', model=ref(21), positive=ref(19), negative=ref(19,1), latent_image=ref(19,2), seed=42, steps=20, cfg=7.5, sampler_name='euler', scheduler='normal', denoise=1.0)
add(23, 'VaeDecodeShapeTrellis', samples=ref(22), vae=ref(17))
add(24, 'SaveGLB', mesh=ref(23), filename_prefix='brunhild512/raw-shape')
add(25, 'Trellis2TextureStage', positive=ref(10), negative=ref(10,1), shape_latent=ref(22))
add(26, 'KSampler', model=ref(11), positive=ref(25), negative=ref(25,1), latent_image=ref(25,2), seed=43, steps=12, cfg=1.0, sampler_name='euler', scheduler='normal', denoise=1.0)
add(27, 'VAELoader', vae_name='trellis_2_texture_vae_bf16.safetensors')
add(28, 'VaeDecodeTextureTrellis', samples=ref(26), vae=ref(27), shape_subdivides=ref(23,1))
add(29, 'PaintMesh', mesh=ref(23), voxel_colors=ref(28))
add(30, 'MeshSmoothNormals', mesh=ref(29), crease_angle=180.0)
add(31, 'SaveGLB', mesh=ref(30), filename_prefix='brunhild512/colored-raw')

(root/'reports/benchmark-api.json').write_text(json.dumps(graph, indent=2)+'\n')
config = {'case': 'brunhild512', 'purpose':'local technical viability; not approved production art', 'pipeline':'native Pixal3D INT8 convrot, pure512 no upscale', 'seeds': {'structure':56,'shape':42,'texture':43}, 'steps': {'structure':12,'shape':20,'texture':12},'sparse_structure_resolution':32, 'expected_shape_resolution':512, 'mesh_processing':'raw mesh; native nearest voxel vertex colors; no remesh, retopology or rig', 'max_seconds':1800,'max_total_gpu_memory_mib':10500,'min_available_ram_mib':4096,'max_gpu_temp_c':80}
(root/'reports/benchmark-config.json').write_text(json.dumps(config,indent=2)+'\n')
print('Preprocess and bounded512 benchmark graphs saved.')
