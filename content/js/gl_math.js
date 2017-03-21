var mat4 = new function()
{
  this.dimension      = 4;
  this.element_number = 16;

  this.zero_matrix = function()
  {
    var z_mat = new Float32Array(this.element_number);

    for(var mat_index = 0 ; mat_index < z_mat.length ; ++mat_index)
    {
      z_mat[mat_index] = 0;
    }

    return z_mat;
  };

  this.identity_matrix = function()
  {
    var i_mat = new Float32Array(this.element_number);

    for(var mat_index = 0 ; mat_index < i_mat.length ; ++mat_index)
    {
      if(mat_index % 5 === 0) i_mat[mat_index] = 1;

      else                    i_mat[mat_index] = 0;
    }

    return i_mat;
  };

  this.translation_matrix = function(tx,ty,tz)
  {
    var t_mat  = this.identity_matrix();

    t_mat[3]  = tx;
    t_mat[7]  = ty;
    t_mat[11] = tz;

    return t_mat;
  };

  this.perspective_matrix = function(field_of_view,aspect_ratio,near,far)
  {
    var p_mat     = this.zero_matrix();
    var tan_alpha = Math.tan((Math.PI / 180) * field_of_view / 2);
    var nf        = near - far;

    p_mat[0]      = 1 / tan_alpha * aspect_ratio;
    p_mat[5]      = 1 / tan_alpha;
    p_mat[10]     = (far + near) / nf;
    p_mat[11]     = 2 * far * near / nf;
    p_mat[14]     = -1;

    return p_mat;
  };

  this.orthogonal_matrix = function(left,right,bottom,top,near,far)
  {
    var o_mat = this.identity_matrix();

    o_mat[0]  = 2 / (right - left);
    o_mat[5]  = 2 / (top - bottom);
    o_mat[10] = 2 / (far - near);

    o_mat[3]  = -((right + left) / (right - left));
    o_mat[7]  = -((top + bottom) / (top - bottom));
    o_mat[11] = -((far + near)   / (far - near));

    return o_mat;
  };

  this.transpose = function(mat)
  {
    var tp_mat = new Float32Array(this.element_number);

    for(var row = 0 ; row < this.dimension ; ++row)
    {
      for(var col = 0 ; col < this.dimension ; ++col)
      {
        var mat_index = col * this.dimension + row;
        var tp_index  = row * this.dimension + col;

        tp_mat[tp_index] = mat[mat_index];
      }
    }

    return tp_mat;
  };

  this.mat_mult = function(mat_1,mat_2)
  {
    var product_mat = this.zero_matrix();

    var mat_index   = 0;

    for(var row = 0 ; row < this.dimension ; ++row)
    {
      var row_index = row * this.dimension;

      for(var col = 0 ; col < this.dimension ; ++col)
      {
        mat_index = row_index + col;

        product_mat[mat_index] += mat_1[row_index]     * mat_2[col];
        product_mat[mat_index] += mat_1[row_index + 1] * mat_2[col + 4];
        product_mat[mat_index] += mat_1[row_index + 2] * mat_2[col + 8];
        product_mat[mat_index] += mat_1[row_index + 3] * mat_2[col + 12];

        // loop version
        /*for(var element = 0 ; element < this.dimension ; ++element)
        {
           product_mat[mat_index] +=

           m1[row_index + element] * m2[col + this.dimension * element];
        }*/
      }
    }

    return product_mat;
  };
};
