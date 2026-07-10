package tecutil

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestRegularMatch(t *testing.T) {
	//pattern := `^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{14,64}$`
	//assert.Equal(t, false, RegularMatch(pattern, "123451234512345"))
	//assert.Equal(t, false, RegularMatch(pattern, "abc1234512345123"))
	//assert.Equal(t, false, RegularMatch(pattern, "Abc1234512345123"))
	//assert.Equal(t, false, RegularMatch(pattern, "abc123451234512@"))
	//assert.Equal(t, false, RegularMatch(pattern, "ABC123451234512@"))
	//assert.Equal(t, false, RegularMatch(pattern, "123123451234512@"))
	//assert.Equal(t, true, RegularMatch(pattern, "Abc123451234512@"))
	//assert.Equal(t, true, RegularMatch(pattern, "这里是测试这里是测试这里是eE1$"))

	pattern := `^[\u4E00-\u9FA5A-Za-z0-9_.]{1,64}$`
	assert.Equal(t, true, RegularMatch(pattern, "12._233b12222111中我absd"))
}
