package data

import (
	"fmt"
	"testing"
)

func TestPassword(t *testing.T) {
	haspassword, _ := hashPassword("wolf123")
	fmt.Sprintf(haspassword)
}
