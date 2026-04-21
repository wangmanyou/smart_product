package dto

// Child 定义结构体
type Child struct {
	Value string `json:"value"`
	Name  string `json:"name"`
}

type Node struct {
	Value          string  `json:"value"`
	Name           string  `json:"name"`
	Children       []Child `json:"children,omitempty"`
	ChildrenConfig []Child `json:"childrenConfig,omitempty"`
}
