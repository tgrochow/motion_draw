// three dimensional uint8 vector
var ivec3 = new function()
{
  // number of components
  this.DIMENSION = 3;


  // check if two vectors are equal
  this.equal = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('ivec3: vector comparison failed');
      return null;
    }

    // actual vector comparison
    return v1[0] === v2[0] && v1[1] === v2[1] && v1[2] === v2[2];
  };

  // add two vectors, return result
  this.add = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('ivec3: vector addition failed');
      return null;
    }

    var v_sum = new Uint8Array(this.DIMENSION);

    // actual vector addition
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_sum[v_index] = v1[v_index] + v2[v_index];
    }

    return v_sum;
  }

  // substract two vectors, return result
  this.sub = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('ivec3: vector substraction failed');
      return null;
    }

    var v_diff = new Uint8Array(this.DIMENSION);

    // actual vector addition
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_diff[v_index] = v1[v_index] - v2[v_index];
    }

    return v_diff;
  };

  // get js array representing the given vector
  this.get_array = function(v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('ivec3: vector array tranformation failed');
      return null;
    }

    return [v[0],v[1],v[2]];
  };

  // check if the passed argument is a valid three dimensional float32 vector
  this.valid_vector = function(v)
  {
    var valid = false;

    // the type of the argument is correct
    if(v instanceof Uint8Array)
    {
      // the dimension of the argument is correct
      if(v.length === this.DIMENSION)
      {
        valid = true;
      }

      // the dimension of the argument is wrong
      else
      {
        console.log('ivec3: the passed Float32Array has the wrong dimension');
      }
    }

    // the type of the argument is wrong
    else
    {
      console.log('ivec3: the passed argument is not a Float32Array');
    }

    return valid;
  };
};

// two dimensional vector
var vec2 = new function()
{
  // number of components
  this.DIMENSION = 2;


  // check if two vectors are equal
  this.equal = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec2: vector comparison failed');
      return null;
    }

    // actual vector comparison
    return v1[0] === v2[0] && v1[1] === v2[1] && v1[2] === v2[2];
  };

  // add two vectors, return result
  this.add = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec2: vector addition failed');
      return null;
    }

    var v_sum = new Float32Array(this.DIMENSION);

    // actual vector addition
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_sum[v_index] = v1[v_index] + v2[v_index];
    }

    return v_sum;
  }

  // substract two vectors, return result
  this.sub = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec2: vector substraction failed');
      return null;
    }

    var v_diff = new Float32Array(this.DIMENSION);

    // actual vector addition
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_diff[v_index] = v1[v_index] - v2[v_index];
    }

    return v_diff;
  };

  this.scalar_mult = function(s,v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec2: vector length calculation failed');
      return null;
    }

    if(typeof s !== 'number')
    {
      console.log('vec2: the passed argument is not a number');
      console.log('vec2: vector length calculation failed');
      return null;
    }

    var v_product = new Float32Array(this.DIMENSION);

    // actual scalar-vector-multiplication
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_product[v_index] = s * v[v_index];
    }

    return v_product;
  };

  // calculate the scalar product of two vectors, if the vectors are normalized
  // the result is equivalent to the angle between the vectors
  this.scalar_product = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec2: scalar product calculation failed');
      return null;
    }

    return (v1[0] * v2[0] + v1[1] * v2[1]);
  };

  // calculate the geomertic length of a vector
  this.geometric_length = function(v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec2: vector length calculation failed');
      return null;
    }

    var length = 0;

    // actual vector normalization
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      length += Math.pow(v[v_index],2);
    }

    length = Math.sqrt(length);

    return length;
  };

  // calculate a vector with the same direction as the argument with length 1
  this.normalize = function(v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec2: vector normalization failed');
      return null;
    }

    var v_norm   = new Float32Array(this.DIMENSION);
    var v_length = this.geometric_length(v);

    // actual normalization of the vector
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_norm[v_index] = v[v_index] / v_length;
    }

    return v_norm;
  };

  // get js array representing the given vector
  this.get_array = function(v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec2: vector array tranformation failed');
      return null;
    }

    return [v[0],v[1]];
  };

  // check if the passed argument is a valid three dimensional float32 vector
  this.valid_vector = function(v)
  {
    var valid = false;

    // the type of the argument is correct
    if(v instanceof Float32Array)
    {
      // the dimension of the argument is correct
      if(v.length === this.DIMENSION)
      {
        valid = true;
      }

      // the dimension of the argument is wrong
      else
      {
        console.log('vec2: the passed Float32Array has the wrong dimension');
      }
    }

    // the type of the argument is wrong
    else
    {
      console.log('vec2: the passed argument is not a Float32Array');
    }

    return valid;
  };
};

// three dimensional vector
var vec3 = new function()
{
  // number of components
  this.DIMENSION = 3;


  // check if two vectors are equal
  this.equal = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec3: vector comparison failed');
      return null;
    }

    // actual vector comparison
    return v1[0] === v2[0] && v1[1] === v2[1] && v1[2] === v2[2];
  };

  // add two vectors, return result
  this.add = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec3: vector addition failed');
      return null;
    }

    var v_sum = new Float32Array(this.DIMENSION);

    // actual vector addition
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_sum[v_index] = v1[v_index] + v2[v_index];
    }

    return v_sum;
  }

  // substract two vectors, return result
  this.sub = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec3: vector substraction failed');
      return null;
    }

    var v_diff = new Float32Array(this.DIMENSION);

    // actual vector addition
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_diff[v_index] = v1[v_index] - v2[v_index];
    }

    return v_diff;
  };

  // multiply every element of a vector with a scalar
  this.scalar_mult = function(s,v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec3: vector length calculation failed');
      return null;
    }

    if(typeof s !== 'number')
    {
      console.log('vec3: the passed argument is not a number');
      console.log('vec3: vector scalar multiplication failed');
      return null;
    }

    var v_product = new Float32Array(this.DIMENSION);

    // actual scalar-vector-multiplication
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_product[v_index] = s * v[v_index];
    }

    return v_product;
  };

  // calculate the scalar product of two vectors, if the vectors are normalized
  // the result is equivalent to the angle between the vectors
  this.scalar_product = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec3: scalar product calculation failed');
      return null;
    }

    return (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]);
  };

  // calculate a third from two given vectors, the third vector is orthogonal to
  // the other two
  this.cross_product = function(v1,v2)
  {
    // passed arguments are not valid vectors
    if(!this.valid_vector(v1) || !this.valid_vector(v2))
    {
      console.log('vec3: cross product calculation failed');
      return null;
    }

    var v_cross = new Float32Array(this.DIMENSION);

    // actual calculation of cross product
    v_cross[0] = v1[1] * v2[2] - v1[2] * v2[1];
    v_cross[1] = v1[2] * v2[0] - v1[0] * v2[2];
    v_cross[2] = v1[0] * v2[1] - v1[1] * v2[0];

    return v_cross;
  }

  // calculate the geomertic length of a vector
  this.geometric_length = function(v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec3: vector length calculation failed');
      return null;
    }

    var length = 0;

    // actual vector normalization
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      length += Math.pow(v[v_index],2);
    }

    length = Math.sqrt(length);

    return length;
  };

  // calculate a vector with the same direction as the argument with length 1
  this.normalize = function(v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec3: vector normalization failed');
      return null;
    }

    var v_norm   = new Float32Array(this.DIMENSION);
    var v_length = this.geometric_length(v);

    // actual normalization of the vector
    for(var v_index = 0 ; v_index < this.DIMENSION ; ++v_index)
    {
      v_norm[v_index] = v[v_index] / v_length;
    }

    return v_norm;
  };

  // get js array representing the given vector
  this.get_array = function(v)
  {
    // passed argument is not valid vectors
    if(!this.valid_vector(v))
    {
      console.log('vec3: vector array tranformation failed');
      return null;
    }

    return [v[0],v[1],v[2]];
  };

  // check if the passed argument is a valid three dimensional float32 vector
  this.valid_vector = function(v)
  {
    var valid = false;

    // the type of the argument is correct
    if(v instanceof Float32Array)
    {
      // the dimension of the argument is correct
      if(v.length === this.DIMENSION)
      {
        valid = true;
      }

      // the dimension of the argument is wrong
      else
      {
        console.log('vec3: the passed Float32Array has the wrong dimension');
      }
    }

    // the type of the argument is wrong
    else
    {
      console.log('vec3: the passed argument is not a Float32Array');
    }

    return valid;
  };
};

// four dimensional matrix
// internaly represented internaly as row first one dimensional array
var mat4 = new function()
{
  this.DIMENSION      = 4;
  this.ELEMENT_NUMBER = 16;

  // create four dimensional zero matrix
  this.zero_matrix = function()
  {
    var m_zero = new Float32Array(this.ELEMENT_NUMBER);

    // init every element of the matrix
    for(var m_index = 0 ; m_index < this.ELEMENT_NUMBER ; ++m_index)
    {
      m_zero[m_index] = 0;
    }

    return m_zero;
  };

  // create four dimensional identity matrix
  this.identity_matrix = function()
  {
    var m_identity = new Float32Array(this.ELEMENT_NUMBER);

    for(var m_index = 0 ; m_index < this.ELEMENT_NUMBER ; ++m_index)
    {
      // diagonal elements are intialized with one
      if(m_index % 5 === 0) m_identity[m_index] = 1;

      else                  m_identity[m_index] = 0;
    }

    return m_identity;
  };

  // create four dimensional matrix, which translates a given point
  this.translation_matrix = function(tx,ty,tz)
  {
    // passed arguments are no valid number
    if(typeof tx !== 'number' ||
       typeof ty !== 'number' ||
       typeof tz !== 'number'   )
    {
      console.log('mat4: the passed argument is not a number');
      console.log('mat4: translation matrix initialization failed');
      return null;
    }

    var m_t = this.identity_matrix();

    // set translation elements of the matrix
    m_t[3]  = tx;
    m_t[7]  = ty;
    m_t[11] = tz;

    return m_t;
  };

  // create four dimensional matrix, which scales a given point
  this.scale_matrix = function(sx,sy,sz)
  {
    // passed arguments are no valid number
    if(typeof sx !== 'number' ||
       typeof sy !== 'number' ||
       typeof sz !== 'number'   )
    {
      console.log('mat4: the passed argument is not a number');
      console.log('mat4: scale matrix initialization failed');
      return null;
    }

    var m_s = this.identity_matrix();

    // set scale elements of the matrix
    m_s[0]  = sx;
    m_s[5]  = sy;
    m_s[10] = sz;

    return m_s;
  };

  // create four dimensional perspective projection matrix
  // the projection is based on a pinhole camera with an infinite small hole
  // the calculation is based on the intercept theorem
  // field_of_view: horizontal view angle
  // aspect_ratio: ratio of canvas dimensions
  // near: distance to the near clipping plane
  // far: distance to the far clipping plane
  this.perspective_projection_matrix = function(field_of_view,
                                                aspect_ratio,near,far)
  {
    // passed arguments are no valid numbers
    if(typeof field_of_view !== 'number' ||
       typeof aspect_ratio  !== 'number' ||
       typeof near          !== 'number' ||
       typeof far           !== 'number'   )
    {
      console.log('mat4: the passed argument is not a number');
      console.log('mat4: perspective projection matrix initialization failed');
      return null;
    }

    // precalculation for better efficiency
    var m_p       = this.zero_matrix();
    var tan_alpha = Math.tan((Math.PI / 180) * field_of_view / 2);
    var nf        = near - far;

    m_p[0]      = 1 / tan_alpha * aspect_ratio;
    m_p[5]      = 1 / tan_alpha;
    m_p[10]     = (far + near) / nf;
    m_p[11]     = 2 * far * near / nf;
    m_p[14]     = -1;

    return m_p;
  };

  // create four dimensional parallel projection matrix
  // the calculation is based on the intercept theorem with parallel rays
  // the distance to the projection center does not affect the projection
  // parameter: distance to different clipping planes
  this.parallel_projection_matrix = function(left,right,bottom,top,near,far)
  {
    // passed arguments are no valid numbers
    if(typeof left   !== 'number' ||
       typeof right  !== 'number' ||
       typeof bottom !== 'number' ||
       typeof top    !== 'number' ||
       typeof near   !== 'number' ||
       typeof far    !== 'number'   )
    {
      console.log('mat4: the passed argument is not a number');
      console.log('mat4: parallel projection matrix initialization failed');
      return null;
    }

    var m_op = this.identity_matrix();

    m_op[0]  = 2 / (right - left);
    m_op[5]  = 2 / (top - bottom);
    m_op[10] = 2 / (far - near);

    m_op[3]  = -((right + left) / (right - left));
    m_op[7]  = -((top + bottom) / (top - bottom));
    m_op[11] = -((far + near)   / (far - near));

    return m_op;
  };

  // flip matrix over diagonal, rows become collumns and likewise
  // return transposed matrix
  this.transpose = function(m)
  {
    // the argument is not a valid matrix
    if(!this.valid_matrix(m))
    {
      console.log('mat4: calculation of transposed matrix failed');
      return null;
    }

    var m_t = new Float32Array(this.ELEMENT_NUMBER);

    for(var row = 0 ; row < this.DIMENSION ; ++row)
    {
      for(var col = 0 ; col < this.DIMENSION ; ++col)
      {
        // calculate original and transposed index
        var mat_index = col * this.DIMENSION + row;
        var tp_index  = row * this.DIMENSION + col;

        // switch values
        m_t[tp_index] = m[mat_index];
      }
    }

    return m_t;
  };

  // matrix multiplication for four dimensional matrices
  this.mat_mult = function(m1,m2)
  {
    // the arguments are not valid matrices
    if(!this.valid_matrix(m1) || !this.valid_matrix(m2))
    {
      console.log('mat4: matrix multiplication failed');
      return null;
    }

    var product_mat = this.zero_matrix();

    var mat_index   = 0;

    for(var row = 0 ; row < this.DIMENSION ; ++row)
    {
      var row_index = row * this.DIMENSION;

      for(var col = 0 ; col < this.DIMENSION ; ++col)
      {
        mat_index = row_index + col;

        product_mat[mat_index] += m1[row_index]     * m2[col];
        product_mat[mat_index] += m1[row_index + 1] * m2[col + 4];
        product_mat[mat_index] += m1[row_index + 2] * m2[col + 8];
        product_mat[mat_index] += m1[row_index + 3] * m2[col + 12];

        // loop version
        /*for(var element = 0 ; element < this.DIMENSION ; ++element)
        {
           product_mat[mat_index] +=

           m1[row_index + element] * m2[col + this.DIMENSION * element];
        }*/
      }
    }

    return product_mat;
  };

  // check if the passed argument is a valid Float32Array with the length of 16
  this.valid_matrix = function(m)
  {
    var valid = false;

    // the type of the argument is correct
    if(m instanceof Float32Array)
    {
      // the length of the array is correct
      if(m.length === this.ELEMENT_NUMBER)
      {
        valid = true;
      }

      // the length of the array is wrong
      else
      {
        console.log('mat4: the passed Float32Array has the wrong length');
      }
    }

    // the type of the argument is wrong
    else
    {
      console.log('mat4: the passed argument is not a Float32Array');
    }

    return valid;
  };
};
