package rds

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDB(t *testing.T) {
	err := Init("127.0.0.1:6379", "")
	assert.Empty(t, err)
	db0 := DB(1)
	assert.NotEmpty(t, db0)
}
