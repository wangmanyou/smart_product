package tecutil

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"
)

//var (
//	json = jsoniter.ConfigCompatibleWithStandardLibrary
//)

// S2M convert struct to map
func S2M(inter interface{}) map[string]interface{} {
	begin := time.Now()
	defer func() {
		fmt.Println("S2M cost:", time.Since(begin))
	}()

	//j, err := json.Marshal(inter)
	//if err != nil {
	//	r.l().Err("s2m json marshal failed", err)
	//	return nil
	//}
	//ret := make(map[string]interface{})
	//if err := json.Unmarshal(j, &ret); err != nil {
	//	r.l().Err("s2m json unmarshal failed", err)
	//	return nil
	//}
	//fmt.Println(ret)
	//return ret
	param := make(map[string]interface{})
	t := reflect.TypeOf(inter)
	v := reflect.ValueOf(inter)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
		v = v.Elem()
	}
	for i := 0; i < t.NumField(); i++ {
		if !t.Field(i).IsExported() {
			continue
		}
		k := t.Field(i).Type.Kind()
		if k == reflect.Ptr {
			k = v.Field(i).Elem().Kind()
		}
		if k == reflect.Struct && t.Field(i).Type.Name() != "Time" {
			inMap := S2M(v.Field(i).Interface())
			for k, v := range inMap {
				param[k] = v
			}
		} else if k == reflect.Slice && !(v.Field(i)).IsZero() && (v.Field(i).Index(0).Kind() == reflect.Int64) {
			param[t.Field(i).Name] = Int64SliceToString(v.Field(i).Interface().([]int64), ",")
		} else if k == reflect.Slice && !(v.Field(i)).IsZero() && (v.Field(i).Index(0).Kind() == reflect.Uint64) {
			param[t.Field(i).Name] = Uint64SliceToString(v.Field(i).Interface().([]uint64), ",")
		} else if k == reflect.Slice && !(v.Field(i)).IsZero() && (v.Field(i).Index(0).Kind() == reflect.Int32) {
			param[t.Field(i).Name] = Int32SliceToString(v.Field(i).Interface().([]int32), ",")
		} else if k == reflect.Slice && !(v.Field(i)).IsZero() && (v.Field(i).Index(0).Kind() == reflect.Uint32) {
			param[t.Field(i).Name] = Uint32SliceToString(v.Field(i).Interface().([]uint32), ",")
		} else if k == reflect.Slice && !(v.Field(i)).IsZero() && (v.Field(i).Index(0).Kind() == reflect.String) {
			param[t.Field(i).Name] = "'" + strings.Join(v.Field(i).Interface().([]string), "','") + "'"
		} else {
			switch t.Field(i).Type.Name() {
			case "Time":
				param[t.Field(i).Name] = v.Field(i).Interface().(time.Time).Local()
			default:
				param[t.Field(i).Name] = v.Field(i).Interface()
			}
		}
	}
	return param
}

func Int64SliceToString(sli []int64, sep string) string {
	return strings.Replace(strings.Trim(fmt.Sprint(sli), "[]"), " ", sep, -1)
}

func Uint64SliceToString(sli []uint64, sep string) string {
	return strings.Replace(strings.Trim(fmt.Sprint(sli), "[]"), " ", sep, -1)
}

func Int32SliceToString(sli []int32, sep string) string {
	return strings.Replace(strings.Trim(fmt.Sprint(sli), "[]"), " ", sep, -1)
}

func Uint32SliceToString(sli []uint32, sep string) string {
	return strings.Replace(strings.Trim(fmt.Sprint(sli), "[]"), " ", sep, -1)
}

func Uint64SliceToStringSlice(sli []uint64) []string {
	var ret []string
	for _, v := range sli {
		ret = append(ret, strconv.FormatUint(v, 10))
	}
	return ret
}
