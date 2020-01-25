#version 300 es
/*
 Modified by dpeck089
 Last update: 1-24-2020 5:28 PM
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * compShader   :   Beeler-Reuter Compute Shader
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 26 Jul 2017 10:36:21 AM EDT
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;
precision highp int ;

/*------------------------------------------------------------------------
 * Interface variables :
 * varyings change to "in" types in fragment shaders
 * and "out" in vertexShaders
 *------------------------------------------------------------------------
 */
in vec2 pixPos ;

uniform sampler2D   inVfs ;

uniform float       ds_x, ds_y ;
uniform float       dt ;
uniform float       diffCoef, C_m ;

uniform float   C_si ;
#define vSampler  inVfs

/*------------------------------------------------------------------------
 * It turns out for my current graphics card the maximum number of
 * drawBuffers is limited to 8
 *------------------------------------------------------------------------
 */
layout (location = 0 )  out vec4 outVfs ;


/*========================================================================
 * Main body of the shader
 *========================================================================
 */
void main() {
    vec2    cc = pixPos ;
    vec2    size    = vec2(textureSize( vSampler, 0 ) );
    float   cddx    = size.x/ds_x ;
    float   cddy    = size.y/ds_y ;

    cddx *= cddx ;
    cddy *= cddy ;

/*------------------------------------------------------------------------
 * reading from textures
 *------------------------------------------------------------------------
 */
    vec4    C = texture( inVfs , pixPos ) ;
    float   vlt = C.r ;
    float   tim = C.g ;


/*-------------------------------------------------------------------------
 * Laplacian
 *-------------------------------------------------------------------------
 */
    vec2 ii = vec2(1.0,0.0)/size ;
    vec2 jj = vec2(0.0,1.0)/size ;


    float dVlt2dt = ((   texture(vSampler,cc+ii).r
                                -   2.*C.r
                                +   texture(vSampler,cc-ii).r     )*cddx
                            +   (   texture(vSampler,cc+jj).r
                                -   2.*C.r
                                +   texture(vSampler,cc-jj).r     )*cddy  )
 ;


    /* float dVlt2dt = ((   texture(vSampler,cc+ii).r*texture(vSampler,cc+ii).a
                                -   C.r*texture(vSampler,cc+ii).a
                                -   C.r*texture(vSampler,cc-ii).a
                                +   texture(vSampler,cc-ii).r*texture(vSampler,cc-ii).a     )*cddx
                            +   (   texture(vSampler,cc+jj).r*texture(vSampler,cc+jj).a
                                -   C.r*texture(vSampler,cc+jj).a
                                -   C.r*texture(vSampler,cc-jj).a
                                +   texture(vSampler,cc-jj).r*texture(vSampler,cc-jj).a     )*cddy  )
 ;*/
    dVlt2dt *= diffCoef ;

    


/*------------------------------------------------------------------------
 * Euler Update
 *------------------------------------------------------------------------
 */
    vlt += dVlt2dt*dt ;
    tim += -dt ;

    if (tim > 0.0){
        vlt += C.b ;
    }

/*------------------------------------------------------------------------
 * ouputing the shader
 *------------------------------------------------------------------------
 */

    outVfs = vec4(vlt,tim,C.b,0.);

    return ;
}
